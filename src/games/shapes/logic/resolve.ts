import { cloneBoard, findAnyMove, newItem, newPiece, shuffleBoard } from './board'
import { findMatches, specialForGroup, type MatchGroup } from './match'
import { CELL_SCORE, SPECIAL_BONUS, groupScore } from './scoring'
import { comboFor, effectCells, type ComboSeeds } from './specials'
import {
  CELLS,
  KIND_COUNT,
  PRISM_KIND,
  SIZE,
  areAdjacent,
  cellAt,
  cloneField,
  colOf,
  isItem,
  rowOf,
  type Board,
  type EngineContext,
  type Field,
  type Piece,
} from './types'

/** Upper bound for cascades per move – a safety net, practically never reached. */
const MAX_CASCADES = 60

interface SwapPhase {
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
  /** Levels: obstacles after this phase. */
  field?: Field
}

export interface FallPhase {
  type: 'fall'
  moves: { from: number; to: number; id: number }[]
  /**
   * New pieces. `fromRow` is the row they start from: negative (above the board) for the
   * drop animation, or the target row itself for pieces appearing in a cell that no piece
   * can reach (enclosed by obstacles).
   */
  spawned: { cell: number; piece: Piece; fromRow: number }[]
  board: Board
}

/** Levels: drop items that reached the bottom row and leave the board. */
interface CollectPhase {
  type: 'collect'
  cells: number[]
  board: Board
  field: Field
}

interface ShufflePhase {
  type: 'shuffle'
  board: Board
  field?: Field
}

export type Phase = SwapPhase | ClearPhase | FallPhase | CollectPhase | ShufflePhase

interface MoveSummary {
  score: number
  /** Number of pieces cleared. */
  cleared: number
  /** Cleared pieces per kind (index = kind). */
  clearedByKind: number[]
  specialsCreated: number
  /** Deepest cascade level reached (1 = no cascade). */
  maxCascade: number
  /** Levels: target tiles cleared. */
  targetsCleared: number
  /** Levels: crates destroyed completely. */
  cratesDestroyed: number
  /** Levels: chains released. */
  chainsFreed: number
  /** Levels: drop items that reached the bottom. */
  itemsCollected: number
}

export interface ResolveResult {
  valid: boolean
  phases: Phase[]
  /** Final, stable board (unchanged input board for invalid moves). */
  board: Board
  /** Final obstacles (levels only; the unchanged input field for invalid moves). */
  field?: Field
  summary: MoveSummary
}

function emptySummary(): MoveSummary {
  return {
    score: 0,
    cleared: 0,
    clearedByKind: new Array<number>(KIND_COUNT).fill(0),
    specialsCreated: 0,
    maxCascade: 0,
    targetsCleared: 0,
    cratesDestroyed: 0,
    chainsFreed: 0,
    itemsCollected: 0,
  }
}

/**
 * Plays the swap of cells `a` → `b` (the piece on `a` is the one the player moved) and
 * resolves all consequences: matches, specials, obstacles, cascades, refills, collected
 * drop items and – if needed – a shuffle. Deterministic for a given context (RNG state and
 * next id).
 *
 * Neither the input board nor the input field is mutated.
 */
export function resolveMove(
  board: Board,
  a: number,
  b: number,
  ctx: EngineContext,
  inputField?: Field,
): ResolveResult {
  const invalid = (): ResolveResult => ({
    valid: false,
    phases: [{ type: 'swap', a, b, valid: false }],
    board,
    field: inputField,
    summary: emptySummary(),
  })

  if (!areAdjacent(a, b)) return invalid()
  const pa = board[a]
  const pb = board[b]
  if (!pa || !pb) return invalid()
  if (inputField && (inputField.chains[a]! > 0 || inputField.chains[b]! > 0)) return invalid()

  const work = cloneBoard(board)
  work[a] = pb
  work[b] = pa
  const field = inputField ? cloneField(inputField) : undefined

  const combo = comboFor(work, a, b, ctx)
  let groups = findMatches(work)
  if (!combo && groups.length === 0) return invalid()

  const summary = emptySummary()
  const phases: Phase[] = [{ type: 'swap', a, b, valid: true }]

  const collectAll = () => {
    for (let guard = 0; field && guard < CELLS; guard++) {
      const collected = collectStep(work, field, summary)
      if (!collected) break
      phases.push(collected)
      phases.push(...fallStep(work, field, ctx))
    }
  }

  let seeds: ComboSeeds | null = combo
  let cascade = 0
  while (seeds || groups.length > 0) {
    cascade++
    phases.push(clearStep(work, field, groups, seeds, cascade === 1 ? [b, a] : [], cascade, summary))
    phases.push(...fallStep(work, field, ctx))
    collectAll()
    seeds = null
    groups = findMatches(work)
    if (cascade >= MAX_CASCADES) break
  }
  summary.maxCascade = Math.max(1, cascade)

  if (!findAnyMove(work, field)) {
    shuffleBoard(work, ctx, field)
    phases.push({
      type: 'shuffle',
      board: cloneBoard(work),
      field: field ? cloneField(field) : undefined,
    })
  }

  return { valid: true, phases, board: work, field, summary }
}

/** Picks the cell where a group's special appears (never on a chained piece). */
function creationCell(
  group: MatchGroup,
  preferred: number[],
  board: Board,
  used: Set<number>,
  field: Field | undefined,
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
  return (
    candidates.find(
      (cell) =>
        !used.has(cell) &&
        board[cell]?.special === 'none' &&
        !(field && field.chains[cell]! > 0),
    ) ?? null
  )
}

const NEIGHBOURS = (cell: number): number[] => {
  const list: number[] = []
  const row = rowOf(cell)
  const col = colOf(cell)
  if (row > 0) list.push(cell - SIZE)
  if (row < SIZE - 1) list.push(cell + SIZE)
  if (col > 0) list.push(cell - 1)
  if (col < SIZE - 1) list.push(cell + 1)
  return list
}

function clearStep(
  work: Board,
  field: Field | undefined,
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
  /** Crates hit in this phase – each crate loses at most one hit point per phase. */
  const crateHits = new Set<number>()
  let score = 0

  const isChained = (cell: number) => field !== undefined && field.chains[cell]! > 0
  const isCrate = (cell: number) => field !== undefined && field.crates[cell]! > 0
  const freeChain = (cell: number) => {
    if (!isChained(cell)) return
    field!.chains[cell] = 0
    summary.chainsFreed++
  }

  /** A cell hit by a special effect or combo. Returns whether the piece is cleared. */
  const hit = (cell: number): boolean => {
    if (isCrate(cell)) {
      crateHits.add(cell)
      return false
    }
    if (isChained(cell)) {
      freeChain(cell)
      return false
    }
    // Drop items are immune; they only leave the board at the bottom.
    return work[cell] != null && !isItem(work[cell])
  }

  for (const { cell, special } of seeds?.convert ?? []) {
    const piece = work[cell]
    if (piece) work[cell] = { ...piece, special }
  }

  for (const group of groups) {
    for (const cell of group.cells) {
      matched.add(cell)
      // A chained piece in a match only loses its chain.
      if (isChained(cell)) freeChain(cell)
      else toClear.add(cell)
    }
    score += groupScore(group.cells.length) * cascade
    const special = specialForGroup(group)
    if (special === 'none') continue
    const cell = creationCell(group, preferred, work, used, field)
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

  // Matches damage crates next to them.
  if (field) {
    for (const cell of matched) {
      for (const next of NEIGHBOURS(cell)) if (isCrate(next)) crateHits.add(next)
    }
  }

  for (const cell of seeds?.cells ?? []) if (hit(cell)) toClear.add(cell)

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
    for (const target of effectCells(work, cell, piece)) {
      if (used.has(target) || toClear.has(target)) continue
      if (!hit(target)) continue
      toClear.add(target)
      const hitPiece = work[target]
      if (hitPiece && hitPiece.special !== 'none') queue.push(target)
    }
  }

  const cells = [...toClear]
    .filter((cell) => !used.has(cell) && work[cell] && !isItem(work[cell]))
    .sort((x, y) => x - y)
  score += cells.filter((cell) => !matched.has(cell)).length * CELL_SCORE * cascade

  for (const cell of cells) {
    const piece = work[cell]!
    if (piece.kind >= 0) summary.clearedByKind[piece.kind]! += 1
    summary.cleared++
    work[cell] = null
    if (field && field.targets[cell]! > 0) {
      field.targets[cell] = 0
      summary.targetsCleared++
    }
  }
  for (const { cell, piece } of created) work[cell] = piece

  if (field) {
    for (const cell of crateHits) {
      field.crates[cell] = Math.max(0, field.crates[cell]! - 1)
      if (field.crates[cell] === 0) summary.cratesDestroyed++
    }
  }
  summary.score += score

  return {
    type: 'clear',
    cells,
    created,
    triggered,
    score,
    cascade,
    board: cloneBoard(work),
    field: field ? cloneField(field) : undefined,
  }
}

/**
 * Gravity and refill, in waves. Each column is split into segments by fixed cells (crates
 * and chained pieces).
 *
 * 1. Pieces fall to the bottom of their segment; the top segment of every column is refilled
 *    from above the board (drop items enter here).
 * 2. An empty cell directly below a fixed cell cannot be reached from above, so a piece
 *    slides into it diagonally from the row above – from the left neighbour column if
 *    possible, otherwise from the right one. Its old cell is filled by the next wave.
 *
 * Both steps repeat until nothing moves any more. Cells that no piece can reach (enclosed by
 * obstacles) finally get new pieces that appear in place. Each wave is one `fall` phase, so
 * the animation shows the falls and slides one after another.
 */
function fallStep(work: Board, field: Field | undefined, ctx: EngineContext): FallPhase[] {
  const phases: FallPhase[] = []
  const fixed = (cell: number) =>
    field !== undefined && (field.crates[cell]! > 0 || field.chains[cell]! > 0)
  let itemPlaced = false

  for (let wave = 0; wave < CELLS; wave++) {
    const moves: FallPhase['moves'] = []
    const slots: { cell: number; fromRow: number }[] = []

    for (let col = 0; col < SIZE; col++) {
      let row = SIZE - 1
      while (row >= 0) {
        if (fixed(cellAt(row, col))) {
          row--
          continue
        }
        const bottom = row
        while (row >= 0 && !fixed(cellAt(row, col))) row--
        const top = row + 1

        let write = bottom
        for (let r = bottom; r >= top; r--) {
          const cell = cellAt(r, col)
          const piece = work[cell]
          if (!piece) continue
          if (r !== write) {
            const to = cellAt(write, col)
            work[to] = piece
            work[cell] = null
            moves.push({ from: cell, to, id: piece.id })
          }
          write--
        }
        // Only the top segment is refilled from above; lower ones wait for slides.
        if (top !== 0) continue
        const empty = write + 1
        for (let r = 0; r <= write; r++) slots.push({ cell: cellAt(r, col), fromRow: r - empty })
      }
    }

    // Order the refill like the original column-by-column, top-to-bottom spawning.
    slots.sort((x, y) => colOf(x.cell) - colOf(y.cell) || x.cell - y.cell)

    let itemSlot = -1
    if (!itemPlaced && field && field.itemsPending > 0) {
      const onBoard = work.filter((piece) => isItem(piece)).length
      // Items enter in the middle columns where possible (edge columns see few matches).
      const middle = slots.filter((slot) => colOf(slot.cell) >= 2 && colOf(slot.cell) <= SIZE - 3)
      const candidates = middle.length > 0 ? middle : slots
      if (onBoard < field.maxItems && candidates.length > 0) {
        itemSlot = ctx.rng.pick(candidates).cell
        field.itemsPending--
        itemPlaced = true
      }
    }

    const spawned: FallPhase['spawned'] = []
    for (const { cell, fromRow } of slots) {
      const piece = cell === itemSlot ? newItem(ctx) : newPiece(ctx)
      work[cell] = piece
      spawned.push({ cell, piece, fromRow })
    }
    if (wave === 0 || moves.length > 0 || spawned.length > 0) {
      phases.push({ type: 'fall', moves, spawned, board: cloneBoard(work) })
    }

    const slides = slideStep(work, fixed)
    if (slides.length === 0) break
    phases.push({ type: 'fall', moves: slides, spawned: [], board: cloneBoard(work) })
  }

  // Cells no piece can reach: new pieces appear in place (together with the last wave).
  const last = phases[phases.length - 1]!
  for (let cell = 0; cell < CELLS; cell++) {
    if (work[cell] || fixed(cell)) continue
    const piece = newPiece(ctx)
    work[cell] = piece
    last.spawned.push({ cell, piece, fromRow: rowOf(cell) })
  }
  last.board = cloneBoard(work)
  return phases
}

/**
 * Diagonal slides of one wave: every empty cell right below a fixed cell takes a piece from
 * the row above, left neighbour first. Each piece slides at most once per wave. Holes are
 * handled bottom-up, so the lowest gaps are served first.
 */
function slideStep(work: Board, fixed: (cell: number) => boolean): FallPhase['moves'] {
  const slides: FallPhase['moves'] = []
  const slid = new Set<number>()
  for (let row = SIZE - 1; row >= 1; row--) {
    for (let col = 0; col < SIZE; col++) {
      const cell = cellAt(row, col)
      if (work[cell] || fixed(cell) || !fixed(cell - SIZE)) continue
      for (const dc of [-1, 1]) {
        const c = col + dc
        if (c < 0 || c >= SIZE) continue
        const from = cellAt(row - 1, c)
        const piece = work[from]
        if (!piece || fixed(from) || slid.has(piece.id)) continue
        work[cell] = piece
        work[from] = null
        slid.add(piece.id)
        slides.push({ from, to: cell, id: piece.id })
        break
      }
    }
  }
  return slides
}

/** Removes drop items that reached the bottom row. */
function collectStep(work: Board, field: Field, summary: MoveSummary): CollectPhase | null {
  const cells: number[] = []
  for (let col = 0; col < SIZE; col++) {
    const cell = cellAt(SIZE - 1, col)
    if (isItem(work[cell])) {
      work[cell] = null
      cells.push(cell)
    }
  }
  if (cells.length === 0) return null
  summary.itemsCollected += cells.length
  return { type: 'collect', cells, board: cloneBoard(work), field: cloneField(field) }
}
