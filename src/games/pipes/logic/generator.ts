/**
 * Pipes generator: a random spanning tree over the grid, grown from the source, then every
 * tile is turned randomly.
 *
 * `corridor` is the chance to extend the newest pipe (long corridors, easy to follow);
 * otherwise the tree branches at a random older cell (more T-pieces, harder to read).
 */
import { createRng, hashSeed, type Rng } from '@/core/rng'

import { isRight, isSolved, opposite, step } from './rules'
import { DIRECTIONS, SIZES, type Difficulty, type PipesPuzzle } from './types'

interface Params {
  corridor: number
  crosses: boolean
}

const PARAMS: Record<Difficulty, Params> = {
  easy: { corridor: 0.75, crosses: false },
  medium: { corridor: 0.6, crosses: true },
  hard: { corridor: 0.45, crosses: true },
  expert: { corridor: 0.3, crosses: true },
}

const bits = (mask: number) => DIRECTIONS.filter((dir) => mask & dir).length

function spanningTree(width: number, height: number, source: number, params: Params, rng: Rng): number[] {
  const total = width * height
  const mask = new Array<number>(total).fill(0)
  const inTree = new Array<boolean>(total).fill(false)
  inTree[source] = true
  let count = 1
  let newest = source
  const edges = (cell: number) =>
    DIRECTIONS.map((dir) => ({ from: cell, dir, to: step(width, height, cell, dir) })).filter(
      (edge) => edge.to >= 0 && !inTree[edge.to] && (params.crosses || bits(mask[cell]!) < 3),
    )
  const tree: number[] = [source]
  while (count < total) {
    let options = rng.chance(params.corridor) ? edges(newest) : []
    if (options.length === 0) options = tree.flatMap(edges)
    if (options.length === 0) {
      // Only reachable through a cell that would become a cross: allow it.
      options = tree.flatMap((cell) =>
        DIRECTIONS.map((dir) => ({ from: cell, dir, to: step(width, height, cell, dir) })).filter(
          (edge) => edge.to >= 0 && !inTree[edge.to],
        ),
      )
    }
    const edge = rng.pick(options)
    mask[edge.from]! |= edge.dir
    mask[edge.to]! |= opposite(edge.dir)
    inTree[edge.to] = true
    tree.push(edge.to)
    newest = edge.to
    count++
  }
  return mask
}

export function generatePuzzle(difficulty: Difficulty, seed: number): PipesPuzzle {
  const { width, height } = SIZES[difficulty]
  const rng = createRng(hashSeed('pipes', seed))
  const source = Math.floor(height / 2) * width + Math.floor((width - 1) / 2)
  const solution = spanningTree(width, height, source, PARAMS[difficulty], rng)
  const puzzle: PipesPuzzle = { seed, difficulty, width, height, source, solution, scramble: [] }
  for (;;) {
    puzzle.scramble = solution.map(() => rng.int(4))
    const off = solution.filter((_, cell) => !isRight(puzzle, puzzle.scramble, cell)).length
    if (off >= solution.length / 2 && !isSolved(puzzle, puzzle.scramble)) return puzzle
  }
}
