/**
 * Merge engine – pure and deterministic.
 *
 * All tiles slide in one direction; two equal tiles that collide merge into one tile with
 * their sum (each tile merges at most once per move, starting from the side the tiles move
 * towards). After every move that changed something a new tile appears (2 with 90 %,
 * 4 with 10 %) on a random empty cell. The random state is part of the run, so a reloaded
 * game continues exactly as it would have.
 */
import { isInt } from '@/core/guards'
import { createRng } from '@/core/rng'

const VARIANT_CONFIG = {
  small: { size: 3, target: 256 },
  classic: { size: 4, target: 2048 },
  large: { size: 5, target: 4096 },
} as const

export type Variant = keyof typeof VARIANT_CONFIG
export type Direction = 'up' | 'down' | 'left' | 'right'

export interface Tile {
  id: number
  value: number
  /** Cell index = row * size + col. */
  cell: number
}

export interface MergeRun {
  variant: Variant
  size: number
  tiles: Tile[]
  score: number
  /** Moves that changed the board. */
  moves: number
  /** State of the seeded RNG (see core/rng). */
  rngState: number
  nextId: number
  /** The target tile has been reached in this run. */
  won: boolean
  /** The player chose to continue after reaching the target. */
  keepPlaying: boolean
  /** No move is possible any more. */
  over: boolean
}

export interface SlideResult {
  run: MergeRun
  /** Whether the board changed (only then a tile is spawned and the move counts). */
  moved: boolean
  /** Old tile id → the cell it slides to (merged tiles slide onto their partner's cell). */
  destinations: Map<number, number>
  /** Ids of tiles created by merges in this move. */
  mergedIds: Set<number>
  spawned: Tile | null
  /** Points gained in this move (sum of all merged tiles). */
  gained: number
  /** The target tile was reached for the first time with this move. */
  reachedTarget: boolean
}

export function targetOf(variant: Variant): number {
  return VARIANT_CONFIG[variant].target
}

function emptyCells(tiles: readonly Tile[], size: number): number[] {
  const occupied = new Set(tiles.map((tile) => tile.cell))
  const cells: number[] = []
  for (let cell = 0; cell < size * size; cell++) if (!occupied.has(cell)) cells.push(cell)
  return cells
}

/** Spawns a 2 (90 %) or 4 (10 %) on a random empty cell; mutates nothing. */
function spawnTile(
  tiles: readonly Tile[],
  size: number,
  rngState: number,
  id: number,
): { tile: Tile | null; rngState: number } {
  const free = emptyCells(tiles, size)
  if (free.length === 0) return { tile: null, rngState }
  const rng = createRng(rngState)
  const cell = free[rng.int(free.length)]!
  const value = rng.next() < 0.9 ? 2 : 4
  return { tile: { id, value, cell }, rngState: rng.getState() }
}

export function newRun(variant: Variant, seed: number): MergeRun {
  const size = VARIANT_CONFIG[variant].size
  let run: MergeRun = {
    variant,
    size,
    tiles: [],
    score: 0,
    moves: 0,
    rngState: createRng(seed).getState(),
    nextId: 1,
    won: false,
    keepPlaying: false,
    over: false,
  }
  for (let i = 0; i < 2; i++) {
    const spawned = spawnTile(run.tiles, size, run.rngState, run.nextId)
    if (!spawned.tile) break
    run = {
      ...run,
      tiles: [...run.tiles, spawned.tile],
      rngState: spawned.rngState,
      nextId: run.nextId + 1,
    }
  }
  return run
}

/** Cells of every line, ordered from the side the tiles move towards. */
function lines(size: number, direction: Direction): number[][] {
  const result: number[][] = []
  for (let a = 0; a < size; a++) {
    const line: number[] = []
    for (let b = 0; b < size; b++) {
      switch (direction) {
        case 'left':
          line.push(a * size + b)
          break
        case 'right':
          line.push(a * size + (size - 1 - b))
          break
        case 'up':
          line.push(b * size + a)
          break
        case 'down':
          line.push((size - 1 - b) * size + a)
          break
      }
    }
    result.push(line)
  }
  return result
}

/** True if any move is possible (an empty cell or two equal neighbours). */
export function canMove(tiles: readonly Tile[], size: number): boolean {
  if (tiles.length < size * size) return true
  const grid = new Array<number>(size * size).fill(0)
  for (const tile of tiles) grid[tile.cell] = tile.value
  for (let row = 0; row < size; row++) {
    for (let col = 0; col < size; col++) {
      const value = grid[row * size + col]
      if (col + 1 < size && grid[row * size + col + 1] === value) return true
      if (row + 1 < size && grid[(row + 1) * size + col] === value) return true
    }
  }
  return false
}

export function highestTile(tiles: readonly Tile[]): number {
  return tiles.reduce((max, tile) => Math.max(max, tile.value), 0)
}

export function slide(run: MergeRun, direction: Direction): SlideResult {
  const { size } = run
  const byCell = new Map(run.tiles.map((tile) => [tile.cell, tile]))
  const destinations = new Map<number, number>()
  const mergedIds = new Set<number>()
  const tiles: Tile[] = []
  let nextId = run.nextId
  let gained = 0
  let moved = false

  for (const line of lines(size, direction)) {
    // Tiles of this line, nearest to the destination side first.
    const lineTiles = line.map((cell) => byCell.get(cell)).filter((tile): tile is Tile => !!tile)
    let slot = 0
    let last: { tile: Tile; merged: boolean; sources: number[] } | null = null
    const placed: { tile: Tile; merged: boolean; sources: number[] }[] = []
    for (const tile of lineTiles) {
      if (last && !last.merged && last.tile.value === tile.value) {
        // Merge into the previous tile; both old tiles slide onto its cell.
        const value = tile.value * 2
        last.tile = { id: nextId++, value, cell: last.tile.cell }
        last.merged = true
        last.sources.push(tile.id)
        gained += value
        moved = true
        continue
      }
      const cell = line[slot++]!
      if (cell !== tile.cell) moved = true
      last = { tile: { ...tile, cell }, merged: false, sources: [tile.id] }
      placed.push(last)
    }
    for (const entry of placed) {
      for (const source of entry.sources) destinations.set(source, entry.tile.cell)
      if (entry.merged) mergedIds.add(entry.tile.id)
      tiles.push(entry.tile)
    }
  }

  if (!moved) {
    return {
      run,
      moved: false,
      destinations,
      mergedIds,
      spawned: null,
      gained: 0,
      reachedTarget: false,
    }
  }

  const spawned = spawnTile(tiles, size, run.rngState, nextId)
  if (spawned.tile) {
    tiles.push(spawned.tile)
    nextId++
  }
  const target = targetOf(run.variant)
  const reachedTarget = !run.won && highestTile(tiles) >= target
  const next: MergeRun = {
    ...run,
    tiles,
    score: run.score + gained,
    moves: run.moves + 1,
    rngState: spawned.rngState,
    nextId,
    won: run.won || reachedTarget,
    over: !canMove(tiles, size),
  }
  return { run: next, moved: true, destinations, mergedIds, spawned: spawned.tile, gained, reachedTarget }
}

/** Validates a stored run of the given variant; `undefined` if it is malformed. */
export function parseRun(raw: unknown, variant: Variant): MergeRun | undefined {
  if (typeof raw !== 'object' || raw === null) return undefined
  const r = raw as Partial<MergeRun>
  const size = VARIANT_CONFIG[variant].size
  if (r.variant !== variant || r.size !== size) return undefined
  if (![r.score, r.moves, r.rngState, r.nextId].every(isInt)) return undefined
  if (typeof r.won !== 'boolean' || typeof r.keepPlaying !== 'boolean' || typeof r.over !== 'boolean') {
    return undefined
  }
  if (!Array.isArray(r.tiles)) return undefined
  const cells = new Set<number>()
  for (const tile of r.tiles as unknown[]) {
    const t = tile as Partial<Tile>
    if (typeof t !== 'object' || t === null || !isInt(t.id) || !isInt(t.value) || !isInt(t.cell)) {
      return undefined
    }
    const isPowerOfTwo = t.value >= 2 && (t.value & (t.value - 1)) === 0
    if (!isPowerOfTwo || t.cell < 0 || t.cell >= size * size || cells.has(t.cell)) return undefined
    cells.add(t.cell)
  }
  return r as MergeRun
}
