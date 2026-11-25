/** Cells of a square `size`×`size` grid, numbered row by row. */

export function rowOf(size: number, cell: number): number {
  return Math.floor(cell / size)
}

export function colOf(size: number, cell: number): number {
  return cell % size
}

/** The up to 4 orthogonally adjacent cells (up, down, left, right – generators rely on it). */
export function neighbors4(size: number, cell: number): number[] {
  const r = rowOf(size, cell)
  const c = colOf(size, cell)
  const result: number[] = []
  if (r > 0) result.push(cell - size)
  if (r < size - 1) result.push(cell + size)
  if (c > 0) result.push(cell - 1)
  if (c < size - 1) result.push(cell + 1)
  return result
}

/** The up to 8 surrounding cells. */
export function neighbors8(size: number, cell: number): number[] {
  const r = rowOf(size, cell)
  const c = colOf(size, cell)
  const result: number[] = []
  for (let dr = -1; dr <= 1; dr++) {
    for (let dc = -1; dc <= 1; dc++) {
      if (dr === 0 && dc === 0) continue
      const rr = r + dr
      const cc = c + dc
      if (rr >= 0 && rr < size && cc >= 0 && cc < size) result.push(rr * size + cc)
    }
  }
  return result
}
