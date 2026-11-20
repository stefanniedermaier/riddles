/**
 * Human-style logical solver. Used to grade generated puzzles and to produce hints.
 *
 * The board tracks, per cell, whether it is still a candidate, eliminated, or holds a
 * crown. Placing a crown eliminates its row, column, region and the 8 neighbours.
 *
 * | Level | Technique          |
 * | ----- | ------------------ |
 * | 1     | last cell          |
 * | 2     | confinement        |
 * | 3     | forced elimination |
 * | 4     | group confinement  |
 */
import { colOf, rowOf, unitFromId, type Geometry, type Unit } from './geometry'

export type TechniqueId = 'lastCell' | 'confinement' | 'forced' | 'groupConfinement'

export const TECHNIQUE_LEVEL: Record<TechniqueId, number> = {
  lastCell: 1,
  confinement: 2,
  forced: 3,
  groupConfinement: 4,
}

export interface LogicStep {
  technique: TechniqueId
  level: number
  /** Cells that get a crown. */
  placements: number[]
  /** Cells that can be marked as "no crown". */
  eliminations: number[]
  /**
   * The units that justify the step:
   * - lastCell: the unit with a single free cell
   * - confinement: the confined unit
   * - forced: the unit that would lose all its free cells
   * - groupConfinement: the confined group of units
   */
  units: Unit[]
  /** Lines (or regions) the confined units are restricted to (confinement steps). */
  lines: Unit[]
  /** Cells to point at (e.g. the cell a forced elimination is about). */
  focusCells: number[]
}

export const ELIMINATED = 0
export const CANDIDATE = 1
export const PLACED = 2

export class LogicBoard {
  readonly geo: Geometry
  /** Per cell: 0 eliminated, 1 candidate, 2 crown. */
  readonly state: Uint8Array

  constructor(geo: Geometry, state?: Uint8Array) {
    this.geo = geo
    this.state = state ? state.slice() : new Uint8Array(geo.size * geo.size).fill(CANDIDATE)
  }

  clone(): LogicBoard {
    return new LogicBoard(this.geo, this.state)
  }

  place(cell: number): void {
    this.state[cell] = PLACED
    for (const peer of this.geo.peers[cell]!) {
      if (this.state[peer] === CANDIDATE) this.state[peer] = ELIMINATED
    }
  }

  eliminate(cell: number): void {
    if (this.state[cell] === CANDIDATE) this.state[cell] = ELIMINATED
  }

  apply(step: LogicStep): void {
    for (const cell of step.eliminations) this.eliminate(cell)
    for (const cell of step.placements) this.place(cell)
  }

  hasCrown(unit: number): boolean {
    return this.geo.unitCells[unit]!.some((cell) => this.state[cell] === PLACED)
  }

  candidates(unit: number): number[] {
    return this.geo.unitCells[unit]!.filter((cell) => this.state[cell] === CANDIDATE)
  }

  crownCount(): number {
    let count = 0
    for (const s of this.state) if (s === PLACED) count++
    return count
  }

  isSolved(): boolean {
    return this.crownCount() === this.geo.size
  }

  /** A unit without crown and without candidates means the position is impossible. */
  hasContradiction(): boolean {
    for (let u = 0; u < this.geo.unitCells.length; u++) {
      if (!this.hasCrown(u) && this.candidates(u).length === 0) return true
    }
    return false
  }
}

function step(
  technique: TechniqueId,
  parts: Partial<Omit<LogicStep, 'technique' | 'level'>>,
): LogicStep {
  return {
    technique,
    level: TECHNIQUE_LEVEL[technique],
    placements: parts.placements ?? [],
    eliminations: parts.eliminations ?? [],
    units: parts.units ?? [],
    lines: parts.lines ?? [],
    focusCells: parts.focusCells ?? [],
  }
}

// ---------------------------------------------------------------------------
// Level 1 – a row, column or region has exactly one free cell left.

function findLastCell(board: LogicBoard): LogicStep | null {
  const { geo } = board
  // Regions first: "only one cell left in this region" reads most naturally.
  const order = [
    ...Array.from({ length: geo.size }, (_, i) => 2 * geo.size + i),
    ...Array.from({ length: 2 * geo.size }, (_, i) => i),
  ]
  for (const u of order) {
    if (board.hasCrown(u)) continue
    const cands = board.candidates(u)
    if (cands.length === 1) {
      return step('lastCell', {
        placements: cands,
        units: [unitFromId(geo.size, u)],
        focusCells: cands,
      })
    }
  }
  return null
}

// ---------------------------------------------------------------------------
// Level 2 – all free cells of a region lie in one line (or vice versa).

function findConfinement(board: LogicBoard): LogicStep | null {
  const { geo } = board
  const n = geo.size

  // Region → line
  for (let k = 0; k < n; k++) {
    const u = 2 * n + k
    if (board.hasCrown(u)) continue
    const cands = board.candidates(u)
    if (cands.length === 0) continue
    for (const kind of ['row', 'col'] as const) {
      const lineOf = (cell: number) => (kind === 'row' ? rowOf(n, cell) : colOf(n, cell))
      const line = lineOf(cands[0]!)
      if (!cands.every((cell) => lineOf(cell) === line)) continue
      const lineUnit = kind === 'row' ? line : n + line
      const eliminations = board.candidates(lineUnit).filter((cell) => geo.regions[cell] !== k)
      if (eliminations.length > 0) {
        return step('confinement', {
          eliminations,
          units: [{ kind: 'region', index: k }],
          lines: [{ kind, index: line }],
          focusCells: cands,
        })
      }
    }
  }

  // Line → region
  for (let u = 0; u < 2 * n; u++) {
    if (board.hasCrown(u)) continue
    const cands = board.candidates(u)
    if (cands.length === 0) continue
    const region = geo.regions[cands[0]!] as number
    if (!cands.every((cell) => geo.regions[cell] === region)) continue
    const lineCells = new Set(geo.unitCells[u])
    const eliminations = board
      .candidates(2 * n + region)
      .filter((cell) => !lineCells.has(cell))
    if (eliminations.length > 0) {
      return step('confinement', {
        eliminations,
        units: [unitFromId(n, u)],
        lines: [{ kind: 'region', index: region }],
        focusCells: cands,
      })
    }
  }
  return null
}

// ---------------------------------------------------------------------------
// Level 3 – a crown on this cell would leave some unit without any free cell.

function findForced(board: LogicBoard): LogicStep | null {
  const { geo } = board
  const blocked = new Uint8Array(geo.size * geo.size)
  for (let cell = 0; cell < geo.size * geo.size; cell++) {
    if (board.state[cell] !== CANDIDATE) continue
    blocked.fill(0)
    blocked[cell] = 1
    for (const peer of geo.peers[cell]!) blocked[peer] = 1
    const own = geo.cellUnits[cell]!
    for (let u = 0; u < geo.unitCells.length; u++) {
      if (own.includes(u) || board.hasCrown(u)) continue
      const cands = board.candidates(u)
      if (cands.length > 0 && cands.every((c) => blocked[c] === 1)) {
        return step('forced', {
          eliminations: [cell],
          units: [unitFromId(geo.size, u)],
          focusCells: [cell],
        })
      }
    }
  }
  return null
}

// ---------------------------------------------------------------------------
// Level 4 – k regions confined to k lines (or k lines confined to k regions).

function popcount(x: number): number {
  let count = 0
  while (x) {
    x &= x - 1
    count++
  }
  return count
}

function* combinations<T>(items: readonly T[], k: number, start = 0): Generator<T[]> {
  if (k === 0) {
    yield []
    return
  }
  for (let i = start; i <= items.length - k; i++) {
    for (const rest of combinations(items, k - 1, i + 1)) yield [items[i]!, ...rest]
  }
}

function findGroupConfinement(board: LogicBoard): LogicStep | null {
  const { geo } = board
  const n = geo.size
  const openRegions: number[] = []
  for (let k = 0; k < n; k++) if (!board.hasCrown(2 * n + k)) openRegions.push(k)
  const m = openRegions.length

  for (let k = 2; k <= Math.floor(m / 2); k++) {
    for (const kind of ['row', 'col'] as const) {
      const lineOf = (cell: number) => (kind === 'row' ? rowOf(n, cell) : colOf(n, cell))
      const lineUnit = (line: number) => (kind === 'row' ? line : n + line)
      const openLines: number[] = []
      for (let line = 0; line < n; line++) if (!board.hasCrown(lineUnit(line))) openLines.push(line)

      // k regions whose candidates lie within k lines
      const regionLineMask = new Map<number, number>()
      for (const region of openRegions) {
        let mask = 0
        for (const cell of board.candidates(2 * n + region)) mask |= 1 << lineOf(cell)
        regionLineMask.set(region, mask)
      }
      for (const group of combinations(openRegions, k)) {
        let mask = 0
        for (const region of group) mask |= regionLineMask.get(region)!
        if (popcount(mask) !== k) continue
        const lines = openLines.filter((line) => mask & (1 << line))
        const eliminations: number[] = []
        for (const line of lines) {
          for (const cell of board.candidates(lineUnit(line))) {
            if (!group.includes(geo.regions[cell] as number)) eliminations.push(cell)
          }
        }
        if (eliminations.length > 0) {
          return step('groupConfinement', {
            eliminations,
            units: group.map((index) => ({ kind: 'region' as const, index })),
            lines: lines.map((index) => ({ kind, index })),
            focusCells: group.flatMap((region) => board.candidates(2 * n + region)),
          })
        }
      }

      // k lines whose candidates lie within k regions
      const lineRegionMask = new Map<number, number>()
      for (const line of openLines) {
        let mask = 0
        for (const cell of board.candidates(lineUnit(line))) mask |= 1 << (geo.regions[cell] as number)
        lineRegionMask.set(line, mask)
      }
      for (const group of combinations(openLines, k)) {
        let mask = 0
        for (const line of group) mask |= lineRegionMask.get(line)!
        if (popcount(mask) !== k) continue
        const regions = openRegions.filter((region) => mask & (1 << region))
        const eliminations: number[] = []
        for (const region of regions) {
          for (const cell of board.candidates(2 * n + region)) {
            if (!group.includes(lineOf(cell))) eliminations.push(cell)
          }
        }
        if (eliminations.length > 0) {
          return step('groupConfinement', {
            eliminations,
            units: group.map((index) => ({ kind, index })),
            lines: regions.map((index) => ({ kind: 'region' as const, index })),
            focusCells: group.flatMap((line) => board.candidates(lineUnit(line))),
          })
        }
      }
    }
  }
  return null
}

// ---------------------------------------------------------------------------

/** Individual technique finders (exported for tests). */
export const finders = {
  lastCell: findLastCell,
  confinement: findConfinement,
  forced: findForced,
  groupConfinement: findGroupConfinement,
}

const FINDERS: [number, (board: LogicBoard) => LogicStep | null][] = [
  [1, findLastCell],
  [2, findConfinement],
  [3, findForced],
  [4, findGroupConfinement],
]

/** The simplest available step (up to `maxLevel`), or `null` if stuck. */
export function findStep(board: LogicBoard, maxLevel = 4): LogicStep | null {
  for (const [level, finder] of FINDERS) {
    if (level > maxLevel) break
    const found = finder(board)
    if (found) return found
  }
  return null
}

export interface GradeResult {
  solved: boolean
  hardestLevel: number
  steps: LogicStep[]
  /** Number of steps per level (index = level). */
  levelCounts: number[]
}

/** Solves by logic only, always using the simplest available technique. */
export function solveLogically(geo: Geometry, maxLevel = 4, start?: LogicBoard): GradeResult {
  const board = start ? start.clone() : new LogicBoard(geo)
  const steps: LogicStep[] = []
  const levelCounts = [0, 0, 0, 0, 0]
  let hardestLevel = 0
  while (!board.isSolved()) {
    if (board.hasContradiction()) break
    const next = findStep(board, maxLevel)
    if (!next) break
    board.apply(next)
    steps.push(next)
    levelCounts[next.level]! += 1
    hardestLevel = Math.max(hardestLevel, next.level)
  }
  return { solved: board.isSolved(), hardestLevel, steps, levelCounts }
}
