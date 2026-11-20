/**
 * State and actions of a running Sudoku game (used by SudokuPlay.vue).
 */
import { computed, onBeforeUnmount, ref, shallowRef } from 'vue'

import { randomSeed } from '@/core/rng'
import { recordFinish, recordStart } from '@/core/stats'
import { load, remove, save as saveToStorage } from '@/core/storage'
import { useStopwatch } from '@/core/timer'

import { sudokuPool } from './generate'
import { SAVE_KEY } from './index'
import { PEERS } from './logic/board'
import { getHint, type Hint } from './logic/hints'
import { isSudokuSave, type Difficulty, type SudokuPuzzle, type SudokuSave } from './logic/types'
import { sudokuSettings } from './settings'

export type GameStatus = 'idle' | 'loading' | 'playing' | 'won'

export interface WinResult {
  timeMs: number
  hintsUsed: number
  newBest: boolean
}

const AUTOSAVE_INTERVAL_MS = 5000

export function loadSavedGame(): SudokuSave | null {
  return load<SudokuSave | null>(SAVE_KEY, null, (raw) => (isSudokuSave(raw) ? raw : undefined))
}

export function useSudokuGame() {
  const game = ref<SudokuSave | null>(null)
  const status = ref<GameStatus>('idle')
  const notesMode = ref(false)
  const hint = shallowRef<Hint | null>(null)
  const result = ref<WinResult | null>(null)
  const stopwatch = useStopwatch()

  // --- persistence --------------------------------------------------------

  function persist(): void {
    if (!game.value || status.value !== 'playing') return
    game.value.elapsedMs = Math.round(stopwatch.elapsedMs.value)
    saveToStorage(SAVE_KEY, game.value)
  }

  const autosave = setInterval(() => {
    if (stopwatch.running.value) persist()
  }, AUTOSAVE_INTERVAL_MS)

  function onVisibilityChange(): void {
    if (document.hidden) persist()
  }
  document.addEventListener('visibilitychange', onVisibilityChange)
  window.addEventListener('pagehide', persist)

  onBeforeUnmount(() => {
    persist()
    clearInterval(autosave)
    document.removeEventListener('visibilitychange', onVisibilityChange)
    window.removeEventListener('pagehide', persist)
  })

  // --- lifecycle ------------------------------------------------------------

  function begin(saveState: SudokuSave): void {
    game.value = saveState
    hint.value = null
    result.value = null
    notesMode.value = false
    stopwatch.reset(saveState.elapsedMs)
    status.value = 'playing'
    stopwatch.start()
  }

  async function startNew(difficulty: Difficulty): Promise<void> {
    status.value = 'loading'
    stopwatch.pause()
    let puzzle: SudokuPuzzle
    try {
      puzzle = await sudokuPool.take(difficulty)
    } catch {
      // Last resort: generate on the main thread.
      const { generatePuzzle } = await import('./logic/generator')
      puzzle = generatePuzzle(difficulty, randomSeed())
    }
    recordStart('sudoku', difficulty)
    begin({
      puzzle,
      values: puzzle.givens.slice(),
      notes: new Array<number>(81).fill(0),
      elapsedMs: 0,
      hintsUsed: 0,
      selected: null,
    })
    persist()
  }

  /** Resumes the stored game; returns `false` if there is none. */
  function resume(): boolean {
    const saved = loadSavedGame()
    if (!saved) return false
    begin(saved)
    return true
  }

  function finish(): void {
    if (!game.value) return
    stopwatch.pause()
    const timeMs = Math.round(stopwatch.elapsedMs.value)
    const { newBestTime } = recordFinish('sudoku', game.value.puzzle.difficulty, { timeMs })
    remove(SAVE_KEY)
    result.value = { timeMs, hintsUsed: game.value.hintsUsed, newBest: newBestTime }
    hint.value = null
    status.value = 'won'
  }

  function checkWin(): void {
    const g = game.value
    if (g && g.values.every((digit, cell) => digit === g.puzzle.solution[cell])) finish()
  }

  // --- input ---------------------------------------------------------------

  const isGiven = (cell: number): boolean => (game.value?.puzzle.givens[cell] ?? 0) !== 0

  function select(cell: number | null): void {
    if (!game.value || status.value !== 'playing') return
    game.value.selected = cell
  }

  function setDigit(cell: number, digit: number): void {
    const g = game.value
    if (!g || isGiven(cell)) return
    if (g.values[cell] === digit) {
      g.values[cell] = 0
    } else {
      g.values[cell] = digit
      g.notes[cell] = 0
      if (sudokuSettings.value.autoCleanNotes) {
        for (const peer of PEERS[cell]!) g.notes[peer]! &= ~(1 << digit)
      }
    }
    persist()
    checkWin()
  }

  function toggleNote(cell: number, digit: number): void {
    const g = game.value
    if (!g || isGiven(cell) || g.values[cell] !== 0) return
    g.notes[cell]! ^= 1 << digit
    persist()
  }

  /** Number pad / keyboard input for the selected cell. */
  function input(digit: number): void {
    const g = game.value
    if (!g || status.value !== 'playing' || g.selected === null) return
    hint.value = null
    if (notesMode.value) toggleNote(g.selected, digit)
    else setDigit(g.selected, digit)
  }

  function erase(): void {
    const g = game.value
    if (!g || status.value !== 'playing' || g.selected === null || isGiven(g.selected)) return
    hint.value = null
    g.values[g.selected] = 0
    g.notes[g.selected] = 0
    persist()
  }

  function moveSelection(dRow: number, dCol: number): void {
    const g = game.value
    if (!g) return
    const current = g.selected ?? 40
    const row = (Math.floor(current / 9) + dRow + 9) % 9
    const col = ((current % 9) + dCol + 9) % 9
    select(row * 9 + col)
  }

  function restart(): void {
    const g = game.value
    if (!g) return
    g.values = g.puzzle.givens.slice()
    g.notes = new Array<number>(81).fill(0)
    hint.value = null
    persist()
  }

  // --- hints ---------------------------------------------------------------

  function requestHint(): void {
    const g = game.value
    if (!g || status.value !== 'playing') return
    const next = getHint(g.values, g.puzzle.solution)
    if (next.kind !== 'solved') g.hintsUsed++
    hint.value = next
    persist()
  }

  /** Executes the hint's action: fill in the deduced digit or erase wrong entries. */
  function applyHint(): void {
    const g = game.value
    const current = hint.value
    if (!g || !current) return
    hint.value = null
    if (current.kind === 'mistake') {
      for (const cell of current.cells) {
        g.values[cell] = 0
        g.notes[cell] = 0
      }
      g.selected = current.cells[0] ?? g.selected
      persist()
    } else if (current.kind === 'step' || current.kind === 'reveal') {
      const { cell, digit } = current.placement
      g.selected = cell
      if (g.values[cell] !== digit) setDigit(cell, digit)
    }
  }

  function closeHint(): void {
    hint.value = null
  }

  // --- derived ------------------------------------------------------------

  /** How often every digit (index 1–9) is on the board. */
  const digitCounts = computed(() => {
    const counts = new Array<number>(10).fill(0)
    for (const digit of game.value?.values ?? []) counts[digit]!++
    return counts
  })

  return {
    game,
    status,
    notesMode,
    hint,
    result,
    stopwatch,
    digitCounts,
    startNew,
    resume,
    select,
    input,
    erase,
    moveSelection,
    restart,
    requestHint,
    applyHint,
    closeHint,
    persist,
  }
}
