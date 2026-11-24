/**
 * Water Sort rules: pouring, undo and solved detection.
 */
import { CAPACITY, type Move, type PouredMove, type Tubes } from './types'

/** Colour and length of the run of equal layers on top of a tube. */
export function topRun(tube: readonly number[]): { color: number; count: number } | null {
  if (tube.length === 0) return null
  const color = tube[tube.length - 1]!
  let count = 0
  for (let i = tube.length - 1; i >= 0 && tube[i] === color; i--) count++
  return { color, count }
}

/** Layers that would move from `from` to `to` (0 = not allowed). */
export function pourAmount(tubes: Tubes, { from, to }: Move): number {
  if (from === to) return 0
  const source = tubes[from]
  const target = tubes[to]
  if (!source || !target) return 0
  const run = topRun(source)
  if (!run || target.length >= CAPACITY) return 0
  if (target.length > 0 && target[target.length - 1] !== run.color) return 0
  return Math.min(run.count, CAPACITY - target.length)
}

/** Pours and returns the new tubes plus the move with its amount, or null if not allowed. */
export function pour(tubes: Tubes, move: Move): { tubes: Tubes; move: PouredMove } | null {
  const amount = pourAmount(tubes, move)
  if (amount === 0) return null
  const next = tubes.map((tube) => [...tube])
  const layers = next[move.from]!.splice(next[move.from]!.length - amount, amount)
  next[move.to]!.push(...layers)
  return { tubes: next, move: { ...move, amount } }
}

/** Pours a move back. */
export function unpour(tubes: Tubes, move: PouredMove): Tubes {
  const next = tubes.map((tube) => [...tube])
  const layers = next[move.to]!.splice(next[move.to]!.length - move.amount, move.amount)
  next[move.from]!.push(...layers)
  return next
}

/** A tube that is full with one colour. */
export const isComplete = (tube: readonly number[]): boolean =>
  tube.length === CAPACITY && tube.every((color) => color === tube[0])

export const isSolved = (tubes: Tubes): boolean => tubes.every((tube) => tube.length === 0 || isComplete(tube))
