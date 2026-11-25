/**
 * Mines generator: every board can be solved by logic alone, starting from the revealed
 * start area.
 *
 * 1. Pick a start cell (away from the edges) and keep it and its neighbours free of mines,
 *    so the start opens an area of at least 9 cells. Place the mines at random elsewhere.
 * 2. Solve the board with the logic solver, like a player would.
 * 3. If the solver gets stuck, move one mine next to the unsolved part to a cell far away
 *    from it ("repair") and solve again. After too many repairs start over.
 * 4. Keep the solvable board whose technique profile fits the difficulty best.
 */
import { createRng, hashSeed, type Rng } from '@/core/rng'

import { adjacentCounts, neighbourTable } from './board'
import { solveBoard } from './solver'
import { SIZES, type Difficulty, type MinesPuzzle } from './types'

type Grade = MinesPuzzle['grade']

/** How far a technique profile is from the difficulty target (0 = fits). */
export const GRADE_DISTANCE: Record<Difficulty, (grade: Grade) => number> = {
  // Single numbers only.
  easy: ([, t2, t3, t4]) => t2 + 2 * (t3 + t4),
  // Needs two-number deductions, but no enumeration.
  medium: ([, t2, t3, t4]) => Math.max(0, 2 - t2) + 2 * (t3 + t4),
  // Several harder deductions, at most a few enumerations.
  hard: ([, t2, t3, t4]) => Math.max(0, 8 - t2 - t3) + Math.max(0, t3 + t4 - 2),
  // Needs arrangements or mine counting more than once.
  expert: ([, t2, t3, t4]) => Math.max(0, 2 - t3 - t4) + Math.max(0, 8 - t2),
}

/** Boards (fresh layouts) tried per puzzle before the best solvable one is used. */
const MAX_ATTEMPTS = 40
/** Mine moves per layout before it is dropped. */
const MAX_REPAIRS = 120

export interface GenerateRequest {
  difficulty: Difficulty
  seed: number
}

function pickStart(width: number, height: number, rng: Rng): number {
  const row = rng.range(Math.min(2, height - 2), Math.max(1, height - 3))
  const col = rng.range(Math.min(2, width - 2), Math.max(1, width - 3))
  return row * width + col
}

/** Tries to turn one random layout into a solvable board. */
function buildBoard(
  width: number,
  height: number,
  mineCount: number,
  rng: Rng,
): { mines: number[]; start: number; grade: Grade } | null {
  const total = width * height
  const table = neighbourTable(width, height)
  const start = pickStart(width, height, rng)
  const forbidden = new Set([start, ...table[start]!])
  const isMine = new Uint8Array(total)
  const candidates = rng.shuffle([...Array(total).keys()].filter((cell) => !forbidden.has(cell)))
  for (const cell of candidates.slice(0, mineCount)) isMine[cell] = 1

  for (let repair = 0; repair <= MAX_REPAIRS; repair++) {
    const mines = [...isMine.keys()].filter((cell) => isMine[cell])
    const counts = adjacentCounts(width, height, mines)
    const result = solveBoard(width, height, isMine, counts, start, mineCount)
    if (result.solved) return { mines, start, grade: result.grade }

    // Unknown cells next to the revealed area are the "frontier" the solver got stuck on.
    const k = result.knowledge
    const unknown = (cell: number) => k.numbers[cell] === -1 && k.mines[cell] === 0
    const frontier = new Set<number>()
    for (let cell = 0; cell < total; cell++) {
      if (unknown(cell) && table[cell]!.some((n) => k.numbers[n]! >= 0)) frontier.add(cell)
    }
    const frontierMines = [...frontier].filter((cell) => isMine[cell])
    const from = frontierMines.length
      ? rng.pick(frontierMines)
      : rng.pick([...isMine.keys()].filter((cell) => isMine[cell] && unknown(cell)))
    const targets = [...Array(total).keys()].filter(
      (cell) => !isMine[cell] && unknown(cell) && !forbidden.has(cell) && !frontier.has(cell),
    )
    const fallback = targets.length
      ? targets
      : [...Array(total).keys()].filter((cell) => !isMine[cell] && unknown(cell) && !forbidden.has(cell))
    if (fallback.length === 0 || from === undefined) return null
    isMine[from] = 0
    isMine[rng.pick(fallback)] = 1
  }
  return null
}

export function generatePuzzle(difficulty: Difficulty, seed: number): MinesPuzzle {
  const { width, height, mines } = SIZES[difficulty]
  const distance = GRADE_DISTANCE[difficulty]
  let best: { puzzle: MinesPuzzle; distance: number } | null = null

  // Keep going past MAX_ATTEMPTS until at least one board is solvable.
  for (let attempt = 0; attempt < MAX_ATTEMPTS || !best; attempt++) {
    const rng = createRng(hashSeed('mines', seed, attempt))
    const board = buildBoard(width, height, mines, rng)
    if (!board) continue
    const puzzle: MinesPuzzle = { seed, difficulty, width, height, ...board }
    const d = distance(board.grade)
    if (!best || d < best.distance) best = { puzzle, distance: d }
    if (d === 0) break
  }
  return best.puzzle
}

export function handleGenerateRequest(request: GenerateRequest): MinesPuzzle {
  return generatePuzzle(request.difficulty, request.seed)
}
