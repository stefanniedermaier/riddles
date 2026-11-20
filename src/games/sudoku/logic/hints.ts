/**
 * Hints: point out wrong entries, otherwise explain the next logical placement.
 */
import { PEERS, popcount } from './board'
import { TECHNIQUE_LEVEL, findNextStep } from './grader'
import { applyStep, createLogicState } from './techniques'
import type { CellDigit, Grid, Step } from './types'

export type Hint =
  /** Some player entries differ from the solution. */
  | { kind: 'mistake'; cells: number[] }
  /**
   * Logical deduction. `steps` ends with the placement step; earlier steps are the
   * eliminations needed to get there. `key` is the most advanced elimination step (if any).
   */
  | { kind: 'step'; steps: Step[]; key: Step | null; placement: CellDigit }
  /** No logical step found (should not happen for generated puzzles) – reveal a cell. */
  | { kind: 'reveal'; placement: CellDigit }
  /** Nothing left to do. */
  | { kind: 'solved' }

const MAX_STEPS = 400

export function findMistakes(values: readonly number[], solution: readonly number[]): number[] {
  const wrong: number[] = []
  for (let cell = 0; cell < 81; cell++) {
    if (values[cell] !== 0 && values[cell] !== solution[cell]) wrong.push(cell)
  }
  return wrong
}

/**
 * Computes a hint for the current board. The player's notes are ignored – candidates are
 * derived from the placed digits only.
 */
export function getHint(values: Readonly<Grid>, solution: Readonly<Grid>): Hint {
  const mistakes = findMistakes(values, solution)
  if (mistakes.length > 0) return { kind: 'mistake', cells: mistakes }
  if (values.every((digit) => digit !== 0)) return { kind: 'solved' }

  const state = createLogicState(values)
  if (state) {
    const steps: Step[] = []
    for (let i = 0; i < MAX_STEPS; i++) {
      const step = findNextStep(state)
      if (!step) break
      steps.push(step)
      if (step.placements.length > 0) {
        const placement = step.placements[0]!
        // A sound deduction always agrees with the (unique) solution.
        if (solution[placement.cell] !== placement.digit) break
        const eliminations = steps.slice(0, -1)
        let key: Step | null = null
        for (const candidate of eliminations) {
          if (!key || TECHNIQUE_LEVEL[candidate.technique] >= TECHNIQUE_LEVEL[key.technique]) {
            key = candidate
          }
        }
        return { kind: 'step', steps, key, placement }
      }
      applyStep(state, step)
    }
  }

  // Fallback: reveal the empty cell with the fewest open candidates.
  let best = -1
  let bestCount = 99
  for (let cell = 0; cell < 81; cell++) {
    if (values[cell] !== 0) continue
    let mask = 0x3fe
    for (const peer of PEERS[cell]!) mask &= ~(1 << values[peer]!)
    const count = popcount(mask)
    if (count < bestCount) {
      best = cell
      bestCount = count
    }
  }
  return { kind: 'reveal', placement: { cell: best, digit: solution[best]! } }
}
