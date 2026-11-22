/**
 * State and actions of a running Sudoku game (used by SudokuPlay.vue).
 * Works for the classic 9×9 grid and the 6×6 mini grid (`mode`).
 */
import { computed, onBeforeUnmount, ref, shallowRef } from 'vue'

import { randomSeed } from '@/core/rng'
import { recordFinish, recordStart } from '@/core/stats'
import { load, remove, save as saveToStorage } from '@/core/storage'
import { useStopwatch } from '@/core/timer'

import { poolOf } from './generate'
import { saveKeyOf } from './index'
import { geometryOfCells, type Geometry } from './logic/board'
import { findMistakes, getHint, type Hint } from './logic/hints'
import {
  isSudokuSave,
  modeOfPuzzle,
  sizeOfMode,
  statVariant,
  type Difficulty,
  type SudokuMode,
  type SudokuPuzzle,
  type SudokuSave,
  type UndoStep,
} from './logic/types'
import { sudokuSettings } from './settings'

export type GameStatus = 'idle' | 'loading' | 'playing' | 'won'

export interface WinResult {
  timeMs: number
  hintsUsed: number
  mistakes: number
  newBest: boolean
}

const AUTOSAVE_INTERVAL_MS = 5000

export function loadSavedGame(mode: SudokuMode = 'classic'): SudokuSave | null {
  return load<SudokuSave | null>(saveKeyOf(mode), null, (raw) =>
    isSudokuSave(raw) && modeOfPuzzle(raw.puzzle) === mode ? raw : undefined,
  )
}

export function useSudokuGame() {
  const game = ref<SudokuSave | null>(null)
  const status = ref<GameStatus>('idle')
  const notesMode = ref(false)
  const hint = shallowRef<Hint | null>(null)
  const result = ref<WinResult | null>(null)
  const stopwatch = useStopwatch()

  const mode = computed<SudokuMode>(() => (game.value ? modeOfPuzzle(game.value.puzzle) : 'classic'))
  const geo = computed<Geometry>(() => geometryOfCells(game.value?.values.length ?? 81))

  // --- persistence --------------------------------------------------------

  function persist(): void {
    if (!game.value || status.value !== 'playing') return
    game.value.elapsedMs = Math.round(stopwatch.elapsedMs.value)
    saveToStorage(saveKeyOf(mode.value), game.value)
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
    saveState.history ??= []
    game.value = saveState
    hint.value = null
    result.value = null
    notesMode.value = false
    stopwatch.reset(saveState.elapsedMs)
    status.value = 'playing'
    stopwatch.start()
  }

  async function startNew(difficulty: Difficulty, newMode: SudokuMode = 'classic'): Promise<void> {
    status.value = 'loading'
    stopwatch.pause()
    let puzzle: SudokuPuzzle
    try {
      puzzle = await poolOf(newMode).take(difficulty)
    } catch {
      // Last resort: generate on the main thread.
      const { generatePuzzle } = await import('./logic/generator')
      puzzle = generatePuzzle(difficulty, randomSeed(), { size: sizeOfMode(newMode) })
    }
    recordStart('sudoku', statVariant(newMode, puzzle.difficulty))
    const cells = puzzle.givens.length
    begin({
      puzzle,
      values: puzzle.givens.slice(),
      notes: new Array<number>(cells).fill(0),
      elapsedMs: 0,
      hintsUsed: 0,
      selected: null,
      history: [],
    })
    persist()
  }

  /** Resumes the stored game of a mode; returns `false` if there is none. */
  function resume(resumeMode: SudokuMode = 'classic'): boolean {
    const saved = loadSavedGame(resumeMode)
    if (!saved) return false
    begin(saved)
    return true
  }

  function finish(): void {
    if (!game.value) return
    stopwatch.pause()
    const timeMs = Math.round(stopwatch.elapsedMs.value)
    const variant = statVariant(mode.value, game.value.puzzle.difficulty)
    const { newBestTime } = recordFinish('sudoku', variant, { timeMs })
    remove(saveKeyOf(mode.value))
    result.value = {
      timeMs,
      hintsUsed: game.value.hintsUsed,
      mistakes: game.value.mistakes ?? 0,
      newBest: newBestTime,
    }
    hint.value = null
    status.value = 'won'
  }

  function checkWin(): void {
    const g = game.value
    if (g && g.values.every((digit, cell) => digit === g.puzzle.solution[cell])) finish()
  }

  // --- undo ----------------------------------------------------------------

  /**
   * Runs a board mutation and records it as one undo step (only the cells that changed).
   * Returns `true` if anything changed.
   */
  function mutate(action: (g: SudokuSave) => void): boolean {
    const g = game.value
    if (!g) return false
    const values = g.values.slice()
    const notes = g.notes.slice()
    const selected = g.selected
    action(g)
    const changes: UndoStep['changes'] = []
    for (let cell = 0; cell < values.length; cell++) {
      if (g.values[cell] !== values[cell] || g.notes[cell] !== notes[cell]) {
        changes.push([cell, values[cell]!, notes[cell]!])
      }
    }
    if (changes.length === 0) return false
    ;(g.history ??= []).push({ changes, selected })
    return true
  }

  const canUndo = computed(() => status.value === 'playing' && (game.value?.history?.length ?? 0) > 0)

  /** Reverts the last board change (entries, notes, erasing, hints, clearing). */
  function undo(): void {
    const g = game.value
    if (!g || status.value !== 'playing') return
    const step = g.history?.pop()
    if (!step) return
    for (const [cell, value, notes] of step.changes) {
      g.values[cell] = value
      g.notes[cell] = notes
    }
    g.selected = step.selected
    hint.value = null
    persist()
  }

  // --- input ---------------------------------------------------------------

  const isGiven = (cell: number): boolean => (game.value?.puzzle.givens[cell] ?? 0) !== 0

  function select(cell: number | null): void {
    if (!game.value || status.value !== 'playing') return
    game.value.selected = cell
  }

  function writeDigit(g: SudokuSave, cell: number, digit: number): void {
    if (g.values[cell] === digit) {
      g.values[cell] = 0
      return
    }
    g.values[cell] = digit
    g.notes[cell] = 0
    if (sudokuSettings.value.autoCleanNotes) {
      for (const peer of geo.value.peers[cell]!) g.notes[peer]! &= ~(1 << digit)
    }
  }

  function setDigit(cell: number, digit: number): void {
    if (!game.value || isGiven(cell)) return
    mutate((g) => writeDigit(g, cell, digit))
    persist()
    checkWin()
  }

  function toggleNote(cell: number, digit: number): void {
    const g = game.value
    if (!g || isGiven(cell) || g.values[cell] !== 0) return
    mutate((state) => {
      state.notes[cell]! ^= 1 << digit
    })
    persist()
  }

  /** Number pad / keyboard input for the selected cell. */
  function input(digit: number): void {
    const g = game.value
    if (!g || status.value !== 'playing' || g.selected === null) return
    if (digit < 1 || digit > geo.value.size) return
    hint.value = null
    if (notesMode.value) toggleNote(g.selected, digit)
    else setDigit(g.selected, digit)
  }

  function erase(): void {
    const g = game.value
    if (!g || status.value !== 'playing' || g.selected === null || isGiven(g.selected)) return
    hint.value = null
    const cell = g.selected
    mutate((state) => {
      state.values[cell] = 0
      state.notes[cell] = 0
    })
    persist()
  }

  function moveSelection(dRow: number, dCol: number): void {
    const g = game.value
    if (!g) return
    const n = geo.value.size
    const current = g.selected ?? Math.floor(geo.value.cellCount / 2)
    const row = (Math.floor(current / n) + dRow + n) % n
    const col = ((current % n) + dCol + n) % n
    select(row * n + col)
  }

  /** Clears all entries and notes (one undoable step). */
  function restart(): void {
    const g = game.value
    if (!g) return
    mutate((state) => {
      state.values = state.puzzle.givens.slice()
      state.notes = new Array<number>(state.puzzle.givens.length).fill(0)
    })
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
      mutate((state) => {
        for (const cell of current.cells) {
          state.values[cell] = 0
          state.notes[cell] = 0
        }
      })
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

  // --- check ---------------------------------------------------------------

  /** Cells found by the last "Check" that are still wrong (shown in red). */
  const checkedWrong = computed<number[]>(() => {
    const g = game.value
    if (!g?.checked?.length) return []
    return g.checked.filter((cell) => g.values[cell] !== 0 && g.values[cell] !== g.puzzle.solution[cell])
  })

  /**
   * Highlights wrong entries and counts the ones an earlier check has not counted yet.
   * Returns the number of wrong entries on the board.
   */
  function check(): number {
    const g = game.value
    if (!g || status.value !== 'playing') return 0
    hint.value = null
    const found = findMistakes(g.values, g.puzzle.solution)
    const counted = new Set(checkedWrong.value)
    g.mistakes = (g.mistakes ?? 0) + found.filter((cell) => !counted.has(cell)).length
    g.checked = found
    persist()
    return found.length
  }

  // --- derived ------------------------------------------------------------

  /** How often every digit (index 1–size) is on the board. */
  const digitCounts = computed(() => {
    const counts = new Array<number>(10).fill(0)
    for (const digit of game.value?.values ?? []) counts[digit]!++
    return counts
  })

  return {
    game,
    status,
    mode,
    geo,
    notesMode,
    hint,
    result,
    stopwatch,
    digitCounts,
    canUndo,
    checkedWrong,
    check,
    startNew,
    resume,
    select,
    input,
    erase,
    undo,
    moveSelection,
    restart,
    requestHint,
    applyHint,
    closeHint,
    persist,
  }
}
