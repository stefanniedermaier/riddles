/**
 * Pipes rules: rotating tiles, water flow from the source, solved detection and hints.
 */
import { DIRECTIONS, DOWN, LEFT, RIGHT, UP, sourcesOf, type PipesPuzzle } from './types'

/** The mask turned clockwise by `turns` quarter turns. */
export function rotate(mask: number, turns: number): number {
  let m = mask
  for (let i = 0; i < ((turns % 4) + 4) % 4; i++) m = ((m << 1) | (m >> 3)) & 15
  return m
}

export const opposite = (dir: number): number => (dir === UP ? DOWN : dir === DOWN ? UP : dir === LEFT ? RIGHT : LEFT)

/** Neighbour of `cell` in direction `dir`, or -1 at the border. */
export function step(width: number, height: number, cell: number, dir: number): number {
  const row = Math.floor(cell / width)
  const col = cell % width
  if (dir === UP) return row > 0 ? cell - width : -1
  if (dir === DOWN) return row < height - 1 ? cell + width : -1
  if (dir === LEFT) return col > 0 ? cell - 1 : -1
  return col < width - 1 ? cell + 1 : -1
}

/** Current pipe ends of every cell. */
export function masks(puzzle: PipesPuzzle, turns: readonly number[]): number[] {
  return puzzle.solution.map((mask, cell) => rotate(mask, turns[cell]!))
}

/** Water of a cell: index of the source that reaches it, `DRY` or `MIXED` (two sources). */
const DRY = -1
export const MIXED = -2

/** Per cell the source whose water reaches it through matching ends (see `DRY`, `MIXED`). */
export function colors(puzzle: PipesPuzzle, turns: readonly number[]): number[] {
  const current = masks(puzzle, turns)
  const color = current.map(() => DRY)
  sourcesOf(puzzle).forEach((source, index) => {
    const seen = new Set([source])
    const queue = [source]
    while (queue.length > 0) {
      const cell = queue.shift()!
      color[cell] = color[cell] === DRY || color[cell] === index ? index : MIXED
      for (const dir of DIRECTIONS) {
        if (!(current[cell]! & dir)) continue
        const next = step(puzzle.width, puzzle.height, cell, dir)
        if (next < 0 || seen.has(next) || !(current[next]! & opposite(dir))) continue
        seen.add(next)
        queue.push(next)
      }
    }
  })
  return color
}

/** Cells with water from exactly one source. */
export function flow(puzzle: PipesPuzzle, turns: readonly number[]): boolean[] {
  return colors(puzzle, turns).map((color) => color >= 0)
}

/** Every tile has water from exactly one source and no pipe end is open. */
export function isSolved(puzzle: PipesPuzzle, turns: readonly number[]): boolean {
  const current = masks(puzzle, turns)
  for (let cell = 0; cell < current.length; cell++) {
    for (const dir of DIRECTIONS) {
      if (!(current[cell]! & dir)) continue
      const next = step(puzzle.width, puzzle.height, cell, dir)
      if (next < 0 || !(current[next]! & opposite(dir))) return false
    }
  }
  return flow(puzzle, turns).every(Boolean)
}

/** The tile looks like its solution (symmetric tiles have several such turns). */
export const isRight = (puzzle: PipesPuzzle, turns: readonly number[], cell: number): boolean =>
  rotate(puzzle.solution[cell]!, turns[cell]!) === puzzle.solution[cell]

export type Hint = { kind: 'turn'; cell: number } | { kind: 'unlock'; cell: number } | { kind: 'none' }

/**
 * A locked tile in a wrong position first; otherwise an unlocked tile that is not in its
 * solution position, preferring tiles next to the water.
 */
export function getHint(puzzle: PipesPuzzle, turns: readonly number[], locked: readonly number[]): Hint {
  const lockedSet = new Set(locked)
  const wrongLocked = locked.find((cell) => !isRight(puzzle, turns, cell))
  if (wrongLocked !== undefined) return { kind: 'unlock', cell: wrongLocked }
  const reached = flow(puzzle, turns)
  const candidates = puzzle.solution
    .map((_, cell) => cell)
    .filter((cell) => !lockedSet.has(cell) && !isRight(puzzle, turns, cell))
  if (candidates.length === 0) return { kind: 'none' }
  const nearWater = (cell: number) =>
    DIRECTIONS.some((dir) => {
      const next = step(puzzle.width, puzzle.height, cell, dir)
      return next >= 0 && reached[next]
    })
  return { kind: 'turn', cell: candidates.find(nearWater) ?? candidates[0]! }
}
