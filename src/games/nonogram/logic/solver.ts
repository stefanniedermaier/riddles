/**
 * Grid solver by line logic: applies the single-line solver to every row and column until
 * nothing changes. If that determines every cell, the puzzle has exactly one solution and is
 * solvable without guessing.
 */
import { lineCells, type LineRef } from './lines'
import { solveLine, type Known } from './lineSolver'

export interface ClueSet {
  width: number
  height: number
  rowClues: readonly (readonly number[])[]
  colClues: readonly (readonly number[])[]
}

export interface SolveResult {
  /** -1 = undetermined. */
  cells: Known[]
  solved: boolean
  contradiction: boolean
  /** Full sweeps over all dirty lines. */
  passes: number
}

function clueOf(set: ClueSet, line: LineRef): readonly number[] {
  return line.kind === 'row' ? set.rowClues[line.index]! : set.colClues[line.index]!
}

function allLines(set: Pick<ClueSet, 'width' | 'height'>): LineRef[] {
  return [
    ...Array.from({ length: set.height }, (_, index) => ({ kind: 'row' as const, index })),
    ...Array.from({ length: set.width }, (_, index) => ({ kind: 'col' as const, index })),
  ]
}

/** Runs line logic to a fixpoint, starting from `initial` (all unknown by default). */
export function solveByLines(set: ClueSet, initial?: readonly Known[]): SolveResult {
  const { width, height } = set
  const cells: Known[] = initial ? initial.slice() : new Array<Known>(width * height).fill(-1)
  const rowDirty = new Uint8Array(height).fill(1)
  const colDirty = new Uint8Array(width).fill(1)
  let passes = 0
  let changed = true

  while (changed) {
    changed = false
    passes++
    for (const line of allLines(set)) {
      const dirty = line.kind === 'row' ? rowDirty : colDirty
      if (!dirty[line.index]) continue
      dirty[line.index] = 0
      const indices = lineCells(width, height, line)
      const solved = solveLine(
        indices.map((cell) => cells[cell]!),
        clueOf(set, line),
      )
      if (!solved) return { cells, solved: false, contradiction: true, passes }
      for (let i = 0; i < indices.length; i++) {
        const cell = indices[i]!
        if (cells[cell] === -1 && solved[i] !== -1) {
          cells[cell] = solved[i]!
          changed = true
          // Mark the crossing line dirty.
          if (line.kind === 'row') colDirty[cell % width] = 1
          else rowDirty[Math.floor(cell / width)] = 1
        }
      }
    }
  }

  return { cells, solved: cells.every((c) => c !== -1), contradiction: false, passes }
}

export interface LineStep {
  line: LineRef
  /** Cells that must be filled. */
  fills: number[]
  /** Cells that must stay empty. */
  crosses: number[]
}

/**
 * The next deduction a player can make from `known`: the line whose single-line logic reveals
 * the most new cells. `null` if no line yields anything (solved or contradictory input).
 */
export function nextLineStep(set: ClueSet, known: readonly Known[]): LineStep | null {
  let best: LineStep | null = null
  for (const line of allLines(set)) {
    const indices = lineCells(set.width, set.height, line)
    const solved = solveLine(
      indices.map((cell) => known[cell]!),
      clueOf(set, line),
    )
    if (!solved) continue
    const fills: number[] = []
    const crosses: number[] = []
    indices.forEach((cell, i) => {
      if (known[cell] !== -1) return
      if (solved[i] === 1) fills.push(cell)
      else if (solved[i] === 0) crosses.push(cell)
    })
    const size = fills.length + crosses.length
    if (size > 0 && (!best || size > best.fills.length + best.crosses.length)) {
      best = { line, fills, crosses }
    }
  }
  return best
}
