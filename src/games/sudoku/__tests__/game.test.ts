import { mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it } from 'vitest'
import { defineComponent } from 'vue'

import { getVariantStats, resetStats } from '@/core/stats'
import { has } from '@/core/storage'
import { MINI_SAVE_KEY, SAVE_KEY } from '../index'
import { PEERS } from '../logic/board'
import { loadSavedGame, useSudokuGame } from '../useSudokuGame'

function mountGame() {
  let api!: ReturnType<typeof useSudokuGame>
  const wrapper = mount(
    defineComponent({
      setup() {
        api = useSudokuGame()
        return () => null
      },
    }),
  )
  return { api, wrapper }
}

/** A first action (a note set and cleared again): the game now counts as started and is saved. */
function touch(api: ReturnType<typeof useSudokuGame>): void {
  const cell = api.game.value!.values.indexOf(0)
  api.notesMode.value = true
  api.select(cell)
  api.input(1)
  api.input(1)
  api.notesMode.value = false
}

describe('useSudokuGame', () => {
  beforeEach(() => {
    localStorage.clear()
    resetStats()
  })

  it('plays a game from start to win', async () => {
    const { api, wrapper } = mountGame()
    await api.startNew('easy')
    expect(api.status.value).toBe('playing')
    // Merely opening a puzzle neither saves it nor counts it as started.
    expect(has(SAVE_KEY)).toBe(false)
    expect(getVariantStats('sudoku', 'easy').started).toBe(0)

    const game = api.game.value!
    const empty = game.values.flatMap((digit, cell) => (digit === 0 ? [cell] : []))

    // Notes are toggled and cleaned up when a peer gets the digit.
    const [first, ...rest] = empty
    const digit = game.puzzle.solution[first!]!
    api.notesMode.value = true
    api.select(first!)
    api.input(digit)
    expect(game.notes[first!]).toBe(1 << digit)
    expect(has(SAVE_KEY)).toBe(true)
    expect(getVariantStats('sudoku', 'easy').started).toBe(1)
    api.notesMode.value = false

    // A wrong entry is reported by the hint …
    const wrong = (digit % 9) + 1
    api.input(wrong)
    api.requestHint()
    expect(api.hint.value?.kind).toBe('mistake')
    api.applyHint()
    expect(game.values[first!]).toBe(0)

    // … and a proper hint fills in a correct digit.
    api.requestHint()
    expect(api.hint.value?.kind).toBe('step')
    api.applyHint()
    expect(game.hintsUsed).toBe(2)

    for (const cell of [first!, ...rest]) {
      if (game.values[cell] !== 0) continue
      api.select(cell)
      api.input(game.puzzle.solution[cell]!)
    }
    expect(api.status.value).toBe('won')
    expect(api.result.value?.hintsUsed).toBe(2)
    expect(has(SAVE_KEY)).toBe(false)
    expect(getVariantStats('sudoku', 'easy').finished).toBe(1)
    wrapper.unmount()
  })

  it('drops a puzzle that is generated after leaving', async () => {
    const { api, wrapper } = mountGame()
    const pending = api.startNew('easy')
    expect(api.status.value).toBe('loading')
    wrapper.unmount()
    await pending
    expect(api.game.value).toBeNull()
    expect(api.stopwatch.running.value).toBe(false)
    expect(has(SAVE_KEY)).toBe(false)
    expect(getVariantStats('sudoku', 'easy').started).toBe(0)
  })

  it('resumes a saved game', async () => {
    const first = mountGame()
    await first.api.startNew('medium')
    const cell = first.api.game.value!.values.indexOf(0)
    first.api.select(cell)
    first.api.input(first.api.game.value!.puzzle.solution[cell]!)
    first.wrapper.unmount()

    const saved = loadSavedGame()
    expect(saved?.values[cell]).not.toBe(0)

    const second = mountGame()
    expect(second.api.resume()).toBe(true)
    expect(second.api.game.value?.values).toEqual(saved?.values)
    expect(second.api.game.value?.selected).toBe(cell)
    second.wrapper.unmount()
  })

  it('restart clears entries but keeps givens', async () => {
    const { api, wrapper } = mountGame()
    await api.startNew('easy')
    const game = api.game.value!
    const cell = game.values.indexOf(0)
    api.select(cell)
    api.input(5)
    api.restart()
    expect(api.game.value!.values).toEqual(game.puzzle.givens)
    wrapper.unmount()
  })

  it('undoes entries including auto-cleaned peer notes as one step', async () => {
    const { api, wrapper } = mountGame()
    await api.startNew('easy')
    const game = api.game.value!
    const empties = game.values.flatMap((digit, cell) => (digit === 0 ? [cell] : []))
    const a = empties.find((cell) => PEERS[cell]!.some((p) => game.values[p] === 0))!
    const peer = PEERS[a]!.find((cell) => game.values[cell] === 0)!
    // Note a digit in another empty cell, then place the same digit in a peer of it.
    const digit = game.puzzle.solution[a]!
    api.notesMode.value = true
    api.select(peer)
    api.input(digit)
    api.notesMode.value = false
    const notesBefore = game.notes.slice()

    api.select(a)
    api.input(digit)
    expect(game.values[a]).toBe(digit)
    expect(game.notes[peer]).toBe(0) // auto-cleaned
    expect(api.canUndo.value).toBe(true)

    api.undo()
    expect(game.values[a]).toBe(0)
    expect(game.notes).toEqual(notesBefore)

    api.undo() // the note toggle
    expect(game.notes[peer]).toBe(0)
    expect(api.canUndo.value).toBe(false)
    wrapper.unmount()
  })

  it('undoes erase, clear-entries and hint application', async () => {
    const { api, wrapper } = mountGame()
    await api.startNew('easy')
    const game = api.game.value!
    const cell = game.values.indexOf(0)
    api.select(cell)
    api.input(game.puzzle.solution[cell]!)
    api.erase()
    expect(game.values[cell]).toBe(0)
    api.undo()
    expect(game.values[cell]).toBe(game.puzzle.solution[cell])

    api.restart()
    expect(api.game.value!.values).toEqual(game.puzzle.givens)
    api.undo()
    expect(api.game.value!.values[cell]).toBe(game.puzzle.solution[cell])

    const filled = api.game.value!.values.filter((d) => d !== 0).length
    api.requestHint()
    api.applyHint()
    expect(api.game.value!.values.filter((d) => d !== 0).length).toBe(filled + 1)
    api.undo()
    expect(api.game.value!.values.filter((d) => d !== 0).length).toBe(filled)
    wrapper.unmount()
  })

  it('persists the undo history with the save', async () => {
    const first = mountGame()
    await first.api.startNew('easy')
    const cell = first.api.game.value!.values.indexOf(0)
    first.api.select(cell)
    first.api.input(first.api.game.value!.puzzle.solution[cell]!)
    first.wrapper.unmount()

    const second = mountGame()
    expect(second.api.resume()).toBe(true)
    expect(second.api.canUndo.value).toBe(true)
    second.api.undo()
    expect(second.api.game.value!.values[cell]).toBe(0)
    second.wrapper.unmount()
  })

  it('loads saves of older versions without undo history', async () => {
    const first = mountGame()
    await first.api.startNew('easy')
    touch(first.api)
    first.wrapper.unmount()
    const raw = JSON.parse(localStorage.getItem('riddles:' + SAVE_KEY)!)
    delete raw.history
    localStorage.setItem('riddles:' + SAVE_KEY, JSON.stringify(raw))

    const second = mountGame()
    expect(second.api.resume()).toBe(true)
    expect(second.api.canUndo.value).toBe(false)
    second.wrapper.unmount()
  })

  it('plays the 6×6 mini mode with its own save and statistics', async () => {
    const { api, wrapper } = mountGame()
    await api.startNew('easy', 'mini')
    const game = api.game.value!
    expect(api.mode.value).toBe('mini')
    expect(game.values).toHaveLength(36)
    touch(api)
    expect(has(MINI_SAVE_KEY)).toBe(true)
    expect(has(SAVE_KEY)).toBe(false)
    expect(getVariantStats('sudoku', 'mini-easy').started).toBe(1)

    api.input(7) // out of range for 6×6 – ignored
    for (let cell = 0; cell < 36; cell++) {
      if (game.values[cell] !== 0) continue
      api.select(cell)
      api.input(game.puzzle.solution[cell]!)
    }
    expect(api.status.value).toBe('won')
    expect(has(MINI_SAVE_KEY)).toBe(false)
    expect(getVariantStats('sudoku', 'mini-easy').finished).toBe(1)
    expect(getVariantStats('sudoku', 'easy').finished).toBe(0)
    wrapper.unmount()
  })

  it('resumes classic and mini games independently', async () => {
    const classic = mountGame()
    await classic.api.startNew('easy')
    touch(classic.api)
    classic.wrapper.unmount()
    const mini = mountGame()
    await mini.api.startNew('medium', 'mini')
    touch(mini.api)
    mini.wrapper.unmount()

    expect(loadSavedGame('classic')?.values).toHaveLength(81)
    expect(loadSavedGame('mini')?.values).toHaveLength(36)
    const resumed = mountGame()
    expect(resumed.api.resume('mini')).toBe(true)
    expect(resumed.api.game.value!.puzzle.difficulty).toBe('medium')
    resumed.wrapper.unmount()
  })
})
