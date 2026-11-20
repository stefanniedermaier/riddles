import { cloneBoard, findAnyMove, newPiece, shuffleBoard } from './board'
import { findMatches, specialForGroup, type MatchGroup } from './match'
import { CELL_SCORE, SPECIAL_BONUS, groupScore } from './scoring'
import { comboFor, effectCells, type ComboSeeds } from './specials'
import {
  KIND_COUNT,
  PRISM_KIND,
  SIZE,
  areAdjacent,
  cellAt,
  type Board,
  type EngineContext,
  type Piece,
} from './types'

/** Upper bound for cascades per move – a safety net, practically never reached. */
export const MAX_CASCADES = 60

export interface SwapPhase {
  type: 'swap'
  a: number
  b: number
  /** Invalid swaps are animated there and back again. */
  valid: boolean
}

export interface ClearPhase {
  type: 'clear'
  /** Cells whose pieces disappear. */
  cells: number[]
  /** Specials created by this clear (the piece at `cell` keeps its id and transforms). */
  created: { cell: number; piece: Piece }[]
  /** Cells of specials whose effect fired. */
  triggered: number[]
  score: number
  /** 1 for the direct result of the move, 2+ for cascades. */
  cascade: number
  /** Board after this phase. */
  board: Board
}

export interface FallPhase {
  type: 'fall'
  moves: { from: number; to: number; id: number }[]
  /** New pieces; `fromRow` is negative (above the board) for the drop animation. */
  spawned: { cell: number; piece: Piece; fromRow: number }[]
  board: Board
}

export interface ShufflePhase {
  type: 'shuffle'
  board: Board
}

export type Phase = SwapPhase | ClearPhase | FallPhase | ShufflePhase

export interface MoveSummary {
  score: number
  /** Number of pieces cleared. */
  cleared: number
  /** Cleared pieces per kind (index = kind). */
  clearedByKind: number[]
  specialsCreated: number
  /** Deepest cascade level reached (1 = no cascade). */
  maxCascade: number
}

export interface ResolveResult {
  valid: boolean
  phases: Phase[]
  /** Final, stable board (unchanged input board for invalid moves). */
  board: Board
  summary: MoveSummary
}

function emptySummary(): MoveSummary {
  return {
    score: 0,
    cleared: 0,
    clearedByKind: new Array<number>(KIND_COUNT).fill(0),
    specialsCreated: 0,
    maxCascade: 0,
  }
}

/**
 * Plays the swap of cells `a` → `b` (the piece on `a` is the one the player moved) and
 * resolves all consequences: matches, specials, cascades, refills and – if needed – a
 * shuffle. Deterministic for a given context (RNG state and next id).
 *
 * The input board is never mutated.
 */
export function resolveMove(board: Board, a: number, b: number, ctx: EngineContext): ResolveResult {
  const invalid = (): ResolveResult => ({
    valid: false,
    phases: [{ type: 'swap', a, b, valid: false }],
    board,
    summary: emptySummary(),
  })

  if (!areAdjacent(a, b)) return invalid()
  const pa = board[a]
  const pb = board[b]
  if (!pa || !pb) return invalid()

  const work = cloneBoard(board)
  work[a] = pb
  work[b] = pa

  const combo = comboFor(work, a, b, ctx)
  let groups = findMatches(work)
  if (!combo && groups.length === 0) return invalid()

  const summary = emptySummary()
  const phases: Phase[] = [{ type: 'swap', a, b, valid: true }]

  let seeds: ComboSeeds | null = combo
  let cascade = 1
  for (;;) {
    phases.push(clearStep(work, groups, seeds, cascade === 1 ? [b, a] : [], cascade, summary))
    phases.push(fallStep(work, ctx))
    seeds = null
    groups = findMatches(work)
    if (groups.length === 0 || cascade >= MAX_CASCADES) break
    cascade++
  }
  summary.maxCascade = cascade

  if (!findAnyMove(work)) {
    shuffleBoard(work, ctx)
    phases.push({ type: 'shuffle', board: cloneBoard(work) })
  }

  return { valid: true, phases, board: work, summary }
}

/** Picks the cell where a group's special appears. */
function creationCell(
  group: MatchGroup,
  preferred: number[],
  board: Board,
  used: Set<number>,
): number | null {
  const candidates: number[] = preferred.filter((cell) => group.cells.includes(cell))
  if (group.shape === 'cross') {
    const h = new Set(group.runs.filter((run) => run.dir === 'h').flatMap((run) => run.cells))
    for (const run of group.runs) {
      if (run.dir === 'v') candidates.push(...run.cells.filter((cell) => h.has(cell)))
    }
  }
  const longest = group.runs.reduce((best, run) => (run.cells.length > best.cells.length ? run : best))
  candidates.push(longest.cells[Math.floor((longest.cells.length - 1) / 2)]!)
  candidates.push(...group.cells)
  return candidates.find((cell) => !used.has(cell) && board[cell]?.special === 'none') ?? null
}

function clearStep(
  work: Board,
  groups: MatchGroup[],
  seeds: ComboSeeds | null,
  preferred: number[],
  cascade: number,
  summary: MoveSummary,
): ClearPhase {
  const toClear = new Set<number>()
  const matched = new Set<number>()
  const created: { cell: number; piece: Piece }[] = []
  const used = new Set<number>()
  let score = 0

  for (const { cell, special } of seeds?.convert ?? []) {
    const piece = work[cell]
    if (piece) work[cell] = { ...piece, special }
  }

  for (const group of groups) {
    for (const cell of group.cells) {
      toClear.add(cell)
      matched.add(cell)
    }
    score += groupScore(group.cells.length) * cascade
    const special = specialForGroup(group)
    if (special === 'none') continue
    const cell = creationCell(group, preferred, work, used)
    if (cell === null) continue
    used.add(cell)
    created.push({
      cell,
      piece: {
        id: work[cell]!.id,
        kind: special === 'prism' ? PRISM_KIND : group.kind,
        special,
      },
    })
    score += SPECIAL_BONUS * cascade
    summary.specialsCreated++
  }

  for (const cell of seeds?.cells ?? []) toClear.add(cell)

  // Chain reaction: every special that gets cleared fires its effect.
  const done = new Set<number>(seeds?.consumed ?? [])
  const queue = [...toClear].filter((cell) => !used.has(cell) && work[cell]?.special !== 'none')
  const triggered: number[] = []
  while (queue.length > 0) {
    const cell = queue.shift()!
    const piece = work[cell]
    if (!piece || done.has(piece.id)) continue
    done.add(piece.id)
    triggered.push(cell)
    for (const hit of effectCells(work, cell, piece)) {
      if (used.has(hit) || toClear.has(hit)) continue
      toClear.add(hit)
      const hitPiece = work[hit]
      if (hitPiece && hitPiece.special !== 'none') queue.push(hit)
    }
  }

  const cells = [...toClear].filter((cell) => !used.has(cell) && work[cell]).sort((x, y) => x - y)
  score += cells.filter((cell) => !matched.has(cell)).length * CELL_SCORE * cascade

  for (const cell of cells) {
    const piece = work[cell]!
    if (piece.kind >= 0) summary.clearedByKind[piece.kind]! += 1
    summary.cleared++
    work[cell] = null
  }
  for (const { cell, piece } of created) work[cell] = piece
  summary.score += score

  return { type: 'clear', cells, created, triggered, score, cascade, board: cloneBoard(work) }
}

/** Lets pieces fall into gaps and fills the board from the top. */
function fallStep(work: Board, ctx: EngineContext): FallPhase {
  const moves: FallPhase['moves'] = []
  const spawned: FallPhase['spawned'] = []
  for (let col = 0; col < SIZE; col++) {
    let write = SIZE - 1
    for (let row = SIZE - 1; row >= 0; row--) {
      const cell = cellAt(row, col)
      const piece = work[cell]
      if (!piece) continue
      if (row !== write) {
        const to = cellAt(write, col)
        work[to] = piece
        work[cell] = null
        moves.push({ from: cell, to, id: piece.id })
      }
      write--
    }
    const empty = write + 1
    for (let row = 0; row < empty; row++) {
      const piece = newPiece(ctx)
      const cell = cellAt(row, col)
      work[cell] = piece
      spawned.push({ cell, piece, fromRow: row - empty })
    }
  }
  return { type: 'fall', moves, spawned, board: cloneBoard(work) }
}
