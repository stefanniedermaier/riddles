/**
 * Logic solver. It only uses what a player can see – the numbers of revealed cells, the mines
 * known so far and the total mine count – and never guesses.
 *
 * Every revealed number gives a constraint "exactly k mines among these unknown cells".
 * Techniques, in the order they are tried (see `Technique`):
 *
 * 1. **Single number** – k = 0 → all its cells are safe; k = cell count → all are mines.
 * 2. **Two numbers** – for two overlapping constraints the mines in the shared cells are
 *    bounded from both sides; this can fix the cells outside the overlap (1-1 and 1-2
 *    patterns, subsets).
 * 3. **Arrangements** – the constraints are split into independent groups; all arrangements
 *    of mines in a group are enumerated. A cell that is safe (or a mine) in every arrangement
 *    is deduced.
 * 4. **Mines left** – the arrangements of all groups are combined with the number of mines
 *    left (including cells that touch no number).
 */
import { neighbourTable } from './board'
import type { Technique } from './types'

export interface Knowledge {
  width: number
  height: number
  /** Number on a revealed cell, -1 for cells that are not revealed. */
  numbers: Int8Array
  /** 1 = known mine. */
  mines: Uint8Array
  totalMines: number
}

export interface Step {
  technique: Technique
  /** Unknown cells proven safe. */
  safe: number[]
  /** Unknown cells proven to be mines. */
  mines: number[]
  /** Revealed numbers the deduction is based on. */
  sources: number[]
}

interface Constraint {
  source: number
  cells: number[]
  count: number
}

/** Upper bound of search nodes per group in technique 3; bigger groups are skipped. */
const NODE_BUDGET = 200_000

const isUnknown = (k: Knowledge, cell: number) => k.numbers[cell] === -1 && k.mines[cell] === 0

function buildConstraints(k: Knowledge): Constraint[] {
  const table = neighbourTable(k.width, k.height)
  const result: Constraint[] = []
  for (let cell = 0; cell < k.numbers.length; cell++) {
    const number = k.numbers[cell]!
    if (number < 0) continue
    const cells: number[] = []
    let known = 0
    for (const n of table[cell]!) {
      if (k.mines[n]) known++
      else if (k.numbers[n] === -1) cells.push(n)
    }
    if (cells.length > 0) result.push({ source: cell, cells, count: number - known })
  }
  return result
}

function step(technique: Technique, safe: Iterable<number>, mines: Iterable<number>, sources: number[]): Step | null {
  const s = [...new Set(safe)].sort((a, b) => a - b)
  const m = [...new Set(mines)].sort((a, b) => a - b)
  return s.length || m.length ? { technique, safe: s, mines: m, sources } : null
}

// --- Technique 1 ----------------------------------------------------------------------

function singleStep(c: Constraint): Step | null {
  if (c.count === 0) return step(1, c.cells, [], [c.source])
  if (c.count === c.cells.length) return step(1, [], c.cells, [c.source])
  return null
}

/** All deductions of technique 1 at once (used by the generator for speed). */
function allSingleSteps(k: Knowledge): Step | null {
  const safe = new Set<number>()
  const mines = new Set<number>()
  const sources: number[] = []
  for (const c of buildConstraints(k)) {
    const s = singleStep(c)
    if (!s) continue
    for (const cell of s.safe) safe.add(cell)
    for (const cell of s.mines) mines.add(cell)
    sources.push(c.source)
  }
  return step(1, safe, mines, sources)
}

// --- Technique 2 ----------------------------------------------------------------------

function pairStep(a: Constraint, b: Constraint): Step | null {
  const inB = new Set(b.cells)
  const shared = a.cells.filter((cell) => inB.has(cell))
  if (shared.length === 0) return null
  const inShared = new Set(shared)
  const onlyA = a.cells.filter((cell) => !inShared.has(cell))
  const onlyB = b.cells.filter((cell) => !inShared.has(cell))
  // Mines in the shared cells: at least what A and B cannot place elsewhere, at most what
  // both allow.
  const lo = Math.max(0, a.count - onlyA.length, b.count - onlyB.length)
  const hi = Math.min(shared.length, a.count, b.count)
  if (lo > hi) return null // contradiction – cannot happen for consistent boards
  const safe: number[] = []
  const mines: number[] = []
  const fix = (cells: number[], min: number, max: number) => {
    if (cells.length === 0) return
    if (max === 0) safe.push(...cells)
    else if (min === cells.length) mines.push(...cells)
  }
  fix(onlyA, a.count - hi, a.count - lo)
  fix(onlyB, b.count - hi, b.count - lo)
  fix(shared, lo, hi)
  return step(2, safe, mines, [a.source, b.source])
}

function findPairStep(constraints: Constraint[]): Step | null {
  const byCell = new Map<number, number[]>()
  constraints.forEach((c, index) => {
    for (const cell of c.cells) {
      const list = byCell.get(cell)
      if (list) list.push(index)
      else byCell.set(cell, [index])
    }
  })
  for (let i = 0; i < constraints.length; i++) {
    const partners = new Set<number>()
    for (const cell of constraints[i]!.cells) for (const j of byCell.get(cell)!) if (j > i) partners.add(j)
    for (const j of [...partners].sort((x, y) => x - y)) {
      const s = pairStep(constraints[i]!, constraints[j]!)
      if (s) return s
    }
  }
  return null
}

// --- Techniques 3 and 4 ----------------------------------------------------------------

interface Group {
  cells: number[]
  constraints: Constraint[]
  /** Per mine count m in the group: number of arrangements and, per cell, in how many of them it is a mine. */
  byCount: Map<number, { arrangements: number; mineIn: number[] }> | null
}

function buildGroups(constraints: Constraint[]): Group[] {
  // Union-find over constraints that share a cell.
  const parent = constraints.map((_, index) => index)
  const find = (x: number): number => {
    while (parent[x] !== x) {
      parent[x] = parent[parent[x]!]!
      x = parent[x]!
    }
    return x
  }
  const owner = new Map<number, number>()
  constraints.forEach((c, index) => {
    for (const cell of c.cells) {
      const other = owner.get(cell)
      if (other === undefined) owner.set(cell, index)
      else parent[find(index)] = find(other)
    }
  })
  const groups = new Map<number, Group>()
  constraints.forEach((c, index) => {
    const root = find(index)
    let group = groups.get(root)
    if (!group) {
      group = { cells: [], constraints: [], byCount: null }
      groups.set(root, group)
    }
    group.constraints.push(c)
  })
  for (const group of groups.values()) {
    const cells = new Set<number>()
    for (const c of group.constraints) for (const cell of c.cells) cells.add(cell)
    group.cells = [...cells]
    group.byCount = enumerate(group)
  }
  return [...groups.values()]
}

/** Enumerates all arrangements of a group (null if it exceeds the node budget). */
function enumerate(group: Group): Group['byCount'] {
  // Order cells so that constraints are completed early (better pruning): follow the
  // constraints one after another.
  const order: number[] = []
  const placed = new Set<number>()
  for (const c of group.constraints) {
    for (const cell of c.cells) {
      if (!placed.has(cell)) {
        placed.add(cell)
        order.push(cell)
      }
    }
  }
  const index = new Map(order.map((cell, i) => [cell, i]))
  const cellConstraints: number[][] = order.map(() => [])
  group.constraints.forEach((c, ci) => {
    for (const cell of c.cells) cellConstraints[index.get(cell)!]!.push(ci)
  })
  const mines = group.constraints.map(() => 0)
  const open = group.constraints.map((c) => c.cells.length)
  const value = new Uint8Array(order.length)
  const result = new Map<number, { arrangements: number; mineIn: number[] }>()
  let nodes = 0
  let aborted = false

  const visit = (i: number, total: number): void => {
    if (aborted) return
    if (++nodes > NODE_BUDGET) {
      aborted = true
      return
    }
    if (i === order.length) {
      let entry = result.get(total)
      if (!entry) {
        entry = { arrangements: 0, mineIn: order.map(() => 0) }
        result.set(total, entry)
      }
      entry.arrangements++
      for (let j = 0; j < order.length; j++) entry.mineIn[j]! += value[j]!
      return
    }
    for (const v of [0, 1] as const) {
      let ok = true
      for (const ci of cellConstraints[i]!) {
        const need = group.constraints[ci]!.count - mines[ci]! - v
        const left = open[ci]! - 1
        if (need < 0 || need > left) {
          ok = false
          break
        }
      }
      if (!ok) continue
      for (const ci of cellConstraints[i]!) {
        mines[ci]! += v
        open[ci]! -= 1
      }
      value[i] = v
      visit(i + 1, total + v)
      for (const ci of cellConstraints[i]!) {
        mines[ci]! -= v
        open[ci]! += 1
      }
    }
  }
  visit(0, 0)
  if (aborted) return null
  // Re-map per-cell counts to the group's cell order.
  for (const entry of result.values()) {
    const remapped = group.cells.map((cell) => entry.mineIn[index.get(cell)!]!)
    entry.mineIn = remapped
  }
  return result
}

/** Deductions from the arrangements of a group, restricted to the allowed mine counts. */
function groupDeductions(group: Group, allowed: (count: number) => boolean): { safe: number[]; mines: number[] } {
  const safe: number[] = []
  const mines: number[] = []
  if (!group.byCount) return { safe, mines }
  let total = 0
  const mineIn = group.cells.map(() => 0)
  for (const [count, entry] of group.byCount) {
    if (!allowed(count)) continue
    total += entry.arrangements
    entry.mineIn.forEach((n, i) => (mineIn[i]! += n))
  }
  if (total === 0) return { safe, mines }
  group.cells.forEach((cell, i) => {
    if (mineIn[i] === 0) safe.push(cell)
    else if (mineIn[i] === total) mines.push(cell)
  })
  return { safe, mines }
}

/** Mine totals reachable by combining the given groups. */
function reachableSums(groups: Group[]): Set<number> {
  let sums = new Set([0])
  for (const group of groups) {
    const next = new Set<number>()
    for (const s of sums) for (const count of group.byCount!.keys()) next.add(s + count)
    sums = next
  }
  return sums
}

function mineCountStep(k: Knowledge, groups: Group[]): Step | null {
  if (groups.some((group) => !group.byCount)) return null
  let known = 0
  for (const m of k.mines) known += m
  const left = k.totalMines - known
  const inGroups = new Set<number>()
  for (const group of groups) for (const cell of group.cells) inGroups.add(cell)
  const free: number[] = []
  for (let cell = 0; cell < k.numbers.length; cell++) {
    if (isUnknown(k, cell) && !inGroups.has(cell)) free.push(cell)
  }
  const fits = (sum: number) => left - sum >= 0 && left - sum <= free.length

  const safe: number[] = []
  const mines: number[] = []
  groups.forEach((group, gi) => {
    const others = reachableSums(groups.filter((_, i) => i !== gi))
    const d = groupDeductions(group, (count) => [...others].some((s) => fits(count + s)))
    safe.push(...d.safe)
    mines.push(...d.mines)
  })
  const freeCounts = [...reachableSums(groups)].filter(fits).map((sum) => left - sum)
  if (free.length > 0 && freeCounts.length > 0) {
    if (Math.max(...freeCounts) === 0) safe.push(...free)
    else if (Math.min(...freeCounts) === free.length) mines.push(...free)
  }
  return step(4, safe, mines, [])
}

// --- Entry point -------------------------------------------------------------------------

/**
 * The next logical deduction with the easiest technique that finds one (up to
 * `maxTechnique`), or null if the position cannot be solved further without guessing.
 */
export function findStep(k: Knowledge, maxTechnique: Technique = 4, minTechnique: Technique = 1): Step | null {
  const constraints = buildConstraints(k)
  if (minTechnique <= 1) {
    for (const c of constraints) {
      const s = singleStep(c)
      if (s) return s
    }
  }
  if (maxTechnique < 2) return null
  if (minTechnique <= 2) {
    const s = findPairStep(constraints)
    if (s) return s
  }
  if (maxTechnique < 3) return null
  const groups = buildGroups(constraints)
  for (const group of groups) {
    const d = groupDeductions(group, () => true)
    const s = step(3, d.safe, d.mines, group.constraints.map((c) => c.source).sort((a, b) => a - b))
    if (s) return s
  }
  if (maxTechnique < 4) return null
  return mineCountStep(k, groups)
}

export interface SolveResult {
  solved: boolean
  /** Number of rounds that needed technique 1–4. */
  grade: [number, number, number, number]
  /** Final knowledge (revealed numbers and known mines). */
  knowledge: Knowledge
}

/**
 * Solves a board from its start cell like a player would. `counts` are the true adjacent
 * mine counts, `isMine` the true layout (used only to reveal numbers of cells proven safe).
 */
export function solveBoard(
  width: number,
  height: number,
  isMine: Uint8Array,
  counts: Int8Array,
  start: number,
  totalMines: number,
): SolveResult {
  const k: Knowledge = {
    width,
    height,
    numbers: new Int8Array(width * height).fill(-1),
    mines: new Uint8Array(width * height),
    totalMines,
  }
  const table = neighbourTable(width, height)
  let revealed = 0
  const reveal = (cell: number) => {
    const stack = [cell]
    while (stack.length > 0) {
      const current = stack.pop()!
      if (k.numbers[current] !== -1 || isMine[current]) continue
      k.numbers[current] = counts[current]!
      revealed++
      if (counts[current] === 0) for (const n of table[current]!) if (k.numbers[n] === -1) stack.push(n)
    }
  }
  reveal(start)
  const safeCells = width * height - totalMines
  const grade: [number, number, number, number] = [0, 0, 0, 0]

  while (revealed < safeCells) {
    const s = allSingleSteps(k) ?? findStep(k, 4, 2)
    if (!s) return { solved: false, grade, knowledge: k }
    grade[s.technique - 1]! += 1
    for (const mine of s.mines) k.mines[mine] = 1
    for (const cell of s.safe) reveal(cell)
  }
  return { solved: true, grade, knowledge: k }
}
