/** Orthogonal neighbours of every cell of an N×N grid (cached per size). */
const cache = new Map<number, readonly (readonly number[])[]>()

export function neighbors(size: number): readonly (readonly number[])[] {
  let list = cache.get(size)
  if (!list) {
    list = Array.from({ length: size * size }, (_, cell) => {
      const r = Math.floor(cell / size)
      const c = cell % size
      const result: number[] = []
      if (r > 0) result.push(cell - size)
      if (c < size - 1) result.push(cell + 1)
      if (r < size - 1) result.push(cell + size)
      if (c > 0) result.push(cell - 1)
      return result
    })
    cache.set(size, list)
  }
  return list
}

export function areAdjacent(size: number, a: number, b: number): boolean {
  const dr = Math.abs(Math.floor(a / size) - Math.floor(b / size))
  const dc = Math.abs((a % size) - (b % size))
  return dr + dc === 1
}
