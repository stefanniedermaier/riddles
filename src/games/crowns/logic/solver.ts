/**
 * Exact solver: row-by-row backtracking with bitmasks for used columns and regions,
 * the "no touching" check against the previous row and a region feasibility prune.
 */

export interface CountResult {
  /** Number of solutions found (stops at `limit`). */
  count: number
  /** The solutions found, each as column per row. */
  solutions: number[][]
}

export function countSolutions(size: number, regions: readonly number[], limit = 2): CountResult {
  // regionRowCols[k][r] = bitmask of columns in row r that belong to region k
  const regionRowCols: number[][] = Array.from({ length: size }, () =>
    new Array<number>(size).fill(0),
  )
  for (let cell = 0; cell < size * size; cell++) {
    const r = Math.floor(cell / size)
    const c = cell % size
    regionRowCols[regions[cell] as number]![r]! |= 1 << c
  }

  const cols = new Array<number>(size).fill(-1)
  const solutions: number[][] = []

  function feasible(row: number, colMask: number, regionMask: number): boolean {
    for (let k = 0; k < size; k++) {
      if (regionMask & (1 << k)) continue
      const perRow = regionRowCols[k]!
      let ok = false
      for (let r = row; r < size; r++) {
        if (perRow[r]! & ~colMask) {
          ok = true
          break
        }
      }
      if (!ok) return false
    }
    return true
  }

  function search(row: number, colMask: number, regionMask: number, prevCol: number): boolean {
    if (row === size) {
      solutions.push(cols.slice())
      return solutions.length >= limit
    }
    if (!feasible(row, colMask, regionMask)) return false
    const base = row * size
    for (let c = 0; c < size; c++) {
      if (colMask & (1 << c)) continue
      if (prevCol >= 0 && Math.abs(c - prevCol) <= 1) continue
      const k = regions[base + c] as number
      if (regionMask & (1 << k)) continue
      cols[row] = c
      if (search(row + 1, colMask | (1 << c), regionMask | (1 << k), c)) return true
    }
    cols[row] = -1
    return false
  }

  search(0, 0, 0, -1)
  return { count: solutions.length, solutions }
}

export function hasUniqueSolution(size: number, regions: readonly number[]): boolean {
  return countSolutions(size, regions, 2).count === 1
}
