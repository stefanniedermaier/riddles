/**
 * A greedy player for Bubbles. The level generator uses it to calibrate every level's shot
 * limit (and to reject layouts it cannot solve); tests use it to play whole runs.
 *
 * Each turn it traces every whole-degree angle, simulates the current and the next bubble in
 * every reachable cell and picks the best: most bubbles removed (goal bubbles count extra);
 * when nothing pops, a cell next to the same colour, as high up as possible.
 */
import { LIMIT, neighbours, rowOf } from './grid'
import { place, shoot, swap, type BubblesRun } from './engine'
import { MAX_ANGLE, MIN_ANGLE, trace } from './trace'
import { BOMB, isColor, type Shot } from './types'

interface BotMove {
  angle: number
  /** Swap first (fire the next bubble instead of the current one). */
  swap: boolean
}

function value(run: BubblesRun, cell: number, shot: Shot): number {
  const result = place(run.cells, run.parity, cell, shot)
  const removed = [...result.popped, ...result.fallen]
  if (removed.length > 0) {
    let score = result.popped.length * 10 + result.fallen.length * 14
    if (run.goal?.type === 'free') {
      const marked = new Set(run.marked)
      score += removed.filter((b) => marked.has(b.cell)).length * 40
    } else if (run.goal?.type === 'color') {
      const color = run.goal.color
      score += result.popped.filter((b) => b.value === color).length * 8
    }
    // A bomb is better spent on a big cluster than on two bubbles.
    if (shot === BOMB) score -= 12
    return 1000 + score
  }
  if (rowOf(cell) >= LIMIT) return -1000
  const color = result.placedAs
  const same = isColor(color) ? neighbours(cell, run.parity).filter((n) => run.cells[n] === color).length : 0
  return same * 6 - rowOf(cell)
}

function chooseMove(run: BubblesRun): BotMove {
  const cells = new Map<number, number>()
  for (let angle = MIN_ANGLE; angle <= MAX_ANGLE; angle++) {
    const { cell } = trace(run.cells, run.parity, angle)
    if (cell >= 0 && !cells.has(cell)) cells.set(cell, angle)
  }
  let best: BotMove = { angle: 90, swap: false }
  let bestValue = -Infinity
  const options: [Shot, boolean][] = [[run.current, false]]
  if (run.next !== run.current) options.push([run.next, true])
  for (const [shot, swapped] of options) {
    for (const [cell, angle] of cells) {
      const v = value(run, cell, shot)
      if (v > bestValue) {
        bestValue = v
        best = { angle, swap: swapped }
      }
    }
  }
  return best
}

export interface BotGame {
  run: BubblesRun
  /** Score after each shot. */
  scores: number[]
}

/** Plays until the run is over or `maxShots` were fired. */
export function playOut(start: BubblesRun, maxShots: number, stop?: (run: BubblesRun) => boolean): BotGame {
  let run = start
  const scores: number[] = []
  while (!run.over && run.shots < maxShots && !stop?.(run)) {
    const move = chooseMove(run)
    if (move.swap) run = swap(run)
    const result = shoot(run, move.angle)
    if (result.cell < 0) break
    run = result.run
    scores.push(run.score)
  }
  return { run, scores }
}
