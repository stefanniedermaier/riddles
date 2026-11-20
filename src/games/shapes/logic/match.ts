import { SIZE, cellAt, isMatchable, type Board, type Special } from './types'

export interface Run {
  cells: number[]
  dir: 'h' | 'v'
}

export type MatchShape = 'three' | 'four' | 'five' | 'cross'

/** Connected runs of the same kind (a line, an L or a T). */
export interface MatchGroup {
  kind: number
  /** Unique cells, ascending. */
  cells: number[]
  runs: Run[]
  shape: MatchShape
  /** Direction of the longest run. */
  orientation: 'h' | 'v'
}

/** All horizontal and vertical runs of ≥ 3 equal kinds. */
export function findRuns(board: Board): Run[] {
  const runs: Run[] = []
  for (let row = 0; row < SIZE; row++) {
    let col = 0
    while (col < SIZE) {
      const piece = board[cellAt(row, col)]
      if (!isMatchable(piece)) {
        col++
        continue
      }
      let end = col + 1
      while (end < SIZE && board[cellAt(row, end)]?.kind === piece.kind) end++
      if (end - col >= 3) {
        runs.push({ dir: 'h', cells: range(col, end).map((c) => cellAt(row, c)) })
      }
      col = end
    }
  }
  for (let col = 0; col < SIZE; col++) {
    let row = 0
    while (row < SIZE) {
      const piece = board[cellAt(row, col)]
      if (!isMatchable(piece)) {
        row++
        continue
      }
      let end = row + 1
      while (end < SIZE && board[cellAt(end, col)]?.kind === piece.kind) end++
      if (end - row >= 3) {
        runs.push({ dir: 'v', cells: range(row, end).map((r) => cellAt(r, col)) })
      }
      row = end
    }
  }
  return runs
}

/** Groups runs that share cells (L / T shapes) and classifies them. */
export function findMatches(board: Board): MatchGroup[] {
  const runs = findRuns(board)
  if (runs.length === 0) return []

  const parent = runs.map((_, i) => i)
  const find = (i: number): number => {
    while (parent[i] !== i) {
      parent[i] = parent[parent[i]!]!
      i = parent[i]!
    }
    return i
  }
  const owner = new Map<number, number>()
  runs.forEach((run, i) => {
    for (const cell of run.cells) {
      const other = owner.get(cell)
      if (other === undefined) owner.set(cell, i)
      else parent[find(i)] = find(other)
    }
  })

  const byRoot = new Map<number, Run[]>()
  runs.forEach((run, i) => {
    const root = find(i)
    const list = byRoot.get(root)
    if (list) list.push(run)
    else byRoot.set(root, [run])
  })

  const groups: MatchGroup[] = []
  for (const groupRuns of byRoot.values()) {
    const cells = [...new Set(groupRuns.flatMap((run) => run.cells))].sort((a, b) => a - b)
    const longest = groupRuns.reduce((best, run) =>
      run.cells.length > best.cells.length ? run : best,
    )
    const hasH = groupRuns.some((run) => run.dir === 'h')
    const hasV = groupRuns.some((run) => run.dir === 'v')
    let shape: MatchShape = 'three'
    if (longest.cells.length >= 5) shape = 'five'
    else if (hasH && hasV) shape = 'cross'
    else if (longest.cells.length === 4) shape = 'four'
    groups.push({
      kind: board[cells[0]!]!.kind,
      cells,
      runs: groupRuns,
      shape,
      orientation: longest.dir,
    })
  }
  return groups.sort((a, b) => a.cells[0]! - b.cells[0]!)
}

/** The special piece a match group creates (`'none'` for plain three-in-a-row). */
export function specialForGroup(group: MatchGroup): Special {
  switch (group.shape) {
    case 'five':
      return 'prism'
    case 'cross':
      return 'burst'
    case 'four':
      return group.orientation === 'h' ? 'line-h' : 'line-v'
    default:
      return 'none'
  }
}

/** `true` if the piece at `cell` is part of a horizontal or vertical run of ≥ 3. */
export function matchesAt(board: Board, cell: number): boolean {
  const piece = board[cell]
  if (!isMatchable(piece)) return false
  const row = Math.floor(cell / SIZE)
  const col = cell % SIZE
  const same = (r: number, c: number) =>
    r >= 0 && r < SIZE && c >= 0 && c < SIZE && board[cellAt(r, c)]?.kind === piece.kind

  let h = 1
  for (let c = col - 1; same(row, c); c--) h++
  for (let c = col + 1; same(row, c); c++) h++
  if (h >= 3) return true

  let v = 1
  for (let r = row - 1; same(r, col); r--) v++
  for (let r = row + 1; same(r, col); r++) v++
  return v >= 3
}

function range(from: number, to: number): number[] {
  return Array.from({ length: to - from }, (_, i) => from + i)
}
