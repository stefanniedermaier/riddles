/**
 * Pipes generator: a random spanning forest over the grid – one tree per source, grown
 * together – then every tile is turned randomly.
 *
 * `corridor` is the chance to extend the newest pipe of a tree (long corridors, easy to
 * follow); otherwise the tree branches at a random older cell (more T-pieces, harder to read).
 */
import { createRng, hashSeed, type Rng } from '@/core/rng'

import { isRight, isSolved, opposite, step } from './rules'
import { DIRECTIONS, SIZES, SOURCE_COUNT, type Difficulty, type PipesPuzzle } from './types'

interface Params {
  corridor: number
  crosses: boolean
}

const PARAMS: Record<Difficulty, Params> = {
  easy: { corridor: 0.75, crosses: false },
  medium: { corridor: 0.6, crosses: true },
  hard: { corridor: 0.45, crosses: true },
  expert: { corridor: 0.45, crosses: true },
}

const bits = (mask: number) => DIRECTIONS.filter((dir) => mask & dir).length

interface Edge {
  from: number
  dir: number
  to: number
}

/** Pipe masks of a forest with one tree per source; every cell belongs to exactly one tree. */
function spanningForest(width: number, height: number, sources: readonly number[], params: Params, rng: Rng): number[] {
  const total = width * height
  const mask = new Array<number>(total).fill(0)
  const inTree = new Array<boolean>(total).fill(false)
  const trees = sources.map((source) => {
    inTree[source] = true
    return { cells: [source], newest: source }
  })
  let count = sources.length
  const neighbours = (cell: number, crosses: boolean): Edge[] =>
    DIRECTIONS.map((dir) => ({ from: cell, dir, to: step(width, height, cell, dir) })).filter(
      (edge) => edge.to >= 0 && !inTree[edge.to] && (crosses || bits(mask[cell]!) < 3),
    )
  while (count < total) {
    // The smallest tree that can still grow takes the next cell (balanced networks).
    const growing = trees
      .filter((tree) => tree.cells.some((cell) => neighbours(cell, true).length > 0))
      .sort((a, b) => a.cells.length - b.cells.length)
    const tree = growing[0]!
    let options = rng.chance(params.corridor) ? neighbours(tree.newest, params.crosses) : []
    if (options.length === 0) options = tree.cells.flatMap((cell) => neighbours(cell, params.crosses))
    // Only reachable through a cell that would become a cross: allow it.
    if (options.length === 0) options = tree.cells.flatMap((cell) => neighbours(cell, true))
    const edge = rng.pick(options)
    mask[edge.from]! |= edge.dir
    mask[edge.to]! |= opposite(edge.dir)
    inTree[edge.to] = true
    tree.cells.push(edge.to)
    tree.newest = edge.to
    count++
  }
  return mask
}

/** One source in the middle; several ones spread out, away from the border. */
function placeSources(width: number, height: number, count: number, rng: Rng): number[] {
  const middle = Math.floor(height / 2) * width + Math.floor((width - 1) / 2)
  if (count === 1) return [middle]
  const inner: number[] = []
  for (let row = 1; row < height - 1; row++) for (let col = 1; col < width - 1; col++) inner.push(row * width + col)
  const distance = (a: number, b: number) =>
    Math.abs(Math.floor(a / width) - Math.floor(b / width)) + Math.abs((a % width) - (b % width))
  for (;;) {
    const picked: number[] = []
    for (const cell of rng.shuffle([...inner])) {
      if (picked.every((other) => distance(cell, other) >= 4)) picked.push(cell)
      if (picked.length === count) return picked
    }
  }
}

export function generatePuzzle(difficulty: Difficulty, seed: number): PipesPuzzle {
  const { width, height } = SIZES[difficulty]
  const rng = createRng(hashSeed('pipes', seed))
  const sources = placeSources(width, height, SOURCE_COUNT[difficulty], rng)
  const solution = spanningForest(width, height, sources, PARAMS[difficulty], rng)
  const puzzle: PipesPuzzle = { seed, difficulty, width, height, source: sources[0]!, solution, scramble: [] }
  if (sources.length > 1) puzzle.sources = sources
  for (;;) {
    puzzle.scramble = solution.map(() => rng.int(4))
    const off = solution.filter((_, cell) => !isRight(puzzle, puzzle.scramble, cell)).length
    if (off >= solution.length / 2 && !isSolved(puzzle, puzzle.scramble)) return puzzle
  }
}
