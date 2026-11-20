import { mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it } from 'vitest'
import { defineComponent } from 'vue'

import { getVariantStats, resetStats } from '@/core/stats'
import { has } from '@/core/storage'
import { SAVE_KEY } from '../index'
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

describe('useSudokuGame', () => {
  beforeEach(() => {
    localStorage.clear()
    resetStats()
  })

  it('plays a game from start to win', async () => {
    const { api, wrapper } = mountGame()
    await api.startNew('easy')
    expect(api.status.value).toBe('playing')
    expect(has(SAVE_KEY)).toBe(true)
    expect(getVariantStats('sudoku', 'easy').started).toBe(1)

    const game = api.game.value!
    const empty = game.values.flatMap((digit, cell) => (digit === 0 ? [cell] : []))

    // Notes are toggled and cleaned up when a peer gets the digit.
    const [first, ...rest] = empty
    const digit = game.puzzle.solution[first!]!
    api.notesMode.value = true
    api.select(first!)
    api.input(digit)
    expect(game.notes[first!]).toBe(1 << digit)
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
})
