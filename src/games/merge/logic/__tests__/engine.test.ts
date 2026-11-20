import { describe, expect, it } from 'vitest'

import {
  canMove,
  highestTile,
  newRun,
  parseRun,
  slide,
  type Direction,
  type MergeRun,
  type Variant,
} from '../engine'

/** Builds a run from a row-major grid (0 = empty). */
function runFrom(grid: number[][], variant: Variant = 'classic', extra: Partial<MergeRun> = {}): MergeRun {
  const size = grid.length
  const tiles = grid.flatMap((row, r) =>
    row.flatMap((value, c) => (value ? [{ id: r * size + c + 1, value, cell: r * size + c }] : [])),
  )
  return {
    variant,
    size,
    tiles,
    score: 0,
    moves: 0,
    rngState: 12345,
    nextId: 100,
    won: false,
    keepPlaying: false,
    over: false,
    ...extra,
  }
}

/** Board after a move, without the spawned tile. */
function gridAfter(run: MergeRun, direction: Direction): number[][] {
  const result = slide(run, direction)
  const size = run.size
  const grid = Array.from({ length: size }, () => new Array<number>(size).fill(0))
  for (const tile of result.run.tiles) {
    if (tile.id === result.spawned?.id) continue
    grid[Math.floor(tile.cell / size)]![tile.cell % size] = tile.value
  }
  return grid
}

describe('merge engine – sliding and merging', () => {
  it.each([
    [[2, 2, 2, 2], [4, 4, 0, 0]],
    [[2, 2, 2, 0], [4, 2, 0, 0]],
    [[4, 4, 8, 0], [8, 8, 0, 0]],
    [[2, 0, 0, 2], [4, 0, 0, 0]],
    [[2, 4, 2, 4], [2, 4, 2, 4]],
    [[0, 0, 0, 8], [8, 0, 0, 0]],
    [[8, 8, 8, 8], [16, 16, 0, 0]],
  ])('left: %j → %j (each tile merges at most once)', (row, expected) => {
    const run = runFrom([row, [0, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0]])
    expect(gridAfter(run, 'left')[0]).toEqual(expected)
  })

  it('works in all four directions', () => {
    const grid = [
      [2, 0, 0, 2],
      [0, 0, 0, 0],
      [0, 4, 0, 0],
      [2, 4, 0, 0],
    ]
    expect(gridAfter(runFrom(grid), 'right')[0]).toEqual([0, 0, 0, 4])
    expect(gridAfter(runFrom(grid), 'left')[0]).toEqual([4, 0, 0, 0])
    const up = gridAfter(runFrom(grid), 'up')
    expect(up[0]).toEqual([4, 8, 0, 2])
    const down = gridAfter(runFrom(grid), 'down')
    expect(down[3]).toEqual([4, 8, 0, 2])
  })

  it('merges towards the moving direction', () => {
    // Column 0 top→bottom: 2, 2, 2 – moving down merges the two bottom ones.
    const run = runFrom([
      [2, 0, 0, 0],
      [2, 0, 0, 0],
      [2, 0, 0, 0],
      [0, 0, 0, 0],
    ])
    const down = gridAfter(run, 'down')
    expect(down.map((row) => row[0])).toEqual([0, 0, 2, 4])
    const up = gridAfter(run, 'up')
    expect(up.map((row) => row[0])).toEqual([4, 2, 0, 0])
  })

  it('scores the merged values and counts moves', () => {
    const result = slide(runFrom([[2, 2, 4, 4], [0, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0]]), 'left')
    expect(result.gained).toBe(12)
    expect(result.run.score).toBe(12)
    expect(result.run.moves).toBe(1)
    expect(result.mergedIds.size).toBe(2)
  })

  it('records destinations of every old tile (merged tiles slide onto the partner)', () => {
    const run = runFrom([[0, 2, 0, 2], [0, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0]])
    const result = slide(run, 'left')
    expect(result.destinations.get(2)).toBe(0)
    expect(result.destinations.get(4)).toBe(0)
  })

  it('a move that changes nothing does not spawn, score or count', () => {
    const run = runFrom([[2, 4, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0]])
    const result = slide(run, 'left')
    expect(result.moved).toBe(false)
    expect(result.spawned).toBeNull()
    expect(result.run).toBe(run)
  })
})

describe('merge engine – spawning and determinism', () => {
  it('starts with two tiles and is deterministic per seed', () => {
    const a = newRun('classic', 42)
    const b = newRun('classic', 42)
    expect(a).toEqual(b)
    expect(a.tiles).toHaveLength(2)
    expect(a.size).toBe(4)
    expect(newRun('small', 1).size).toBe(3)
    expect(newRun('large', 1).size).toBe(5)

    const moves: Direction[] = ['left', 'up', 'right', 'down', 'left', 'left', 'up']
    let x = a
    let y = b
    for (const move of moves) {
      x = slide(x, move).run
      y = slide(y, move).run
    }
    expect(x).toEqual(y)
  })

  it('spawns a tile on an empty cell after a real move', () => {
    const run = runFrom([[2, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0]])
    const result = slide(run, 'right')
    expect(result.spawned).not.toBeNull()
    expect([2, 4]).toContain(result.spawned!.value)
    expect(result.spawned!.cell).not.toBe(3)
    expect(result.run.tiles).toHaveLength(2)
  })

  it('spawns 2 in about 90 % and 4 in about 10 % of the cases', () => {
    let twos = 0
    let fours = 0
    for (let seed = 0; seed < 2000; seed++) {
      for (const tile of newRun('classic', seed).tiles) {
        if (tile.value === 2) twos++
        else if (tile.value === 4) fours++
      }
    }
    const share = fours / (twos + fours)
    expect(share).toBeGreaterThan(0.07)
    expect(share).toBeLessThan(0.13)
  })
})

describe('merge engine – end conditions', () => {
  it('detects possible moves and game over', () => {
    const full = runFrom([
      [2, 4, 2],
      [4, 2, 4],
      [2, 4, 2],
    ], 'small')
    expect(canMove(full.tiles, 3)).toBe(false)
    const mergeable = runFrom([
      [2, 2, 4],
      [4, 8, 16],
      [32, 64, 128],
    ], 'small')
    expect(canMove(mergeable.tiles, 3)).toBe(true)
    const withGap = runFrom([
      [2, 4, 2],
      [4, 0, 4],
      [2, 4, 2],
    ], 'small')
    expect(canMove(withGap.tiles, 3)).toBe(true)
  })

  it('marks the run as over when the last move blocks the board', () => {
    // Moving right frees (2,0) only; whatever spawns there (2 or 4) cannot merge.
    const run = runFrom([
      [8, 16, 8],
      [16, 8, 16],
      [32, 64, 0],
    ], 'small', { moves: 5 })
    const result = slide(run, 'right')
    expect(result.moved).toBe(true)
    expect(result.run.over).toBe(true)
  })

  it('detects the target tile once', () => {
    const run = runFrom([[1024, 1024, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0]])
    const first = slide(run, 'left')
    expect(first.reachedTarget).toBe(true)
    expect(first.run.won).toBe(true)
    expect(highestTile(first.run.tiles)).toBe(2048)
    const small = runFrom([[128, 128, 0], [0, 0, 0], [0, 0, 0]], 'small', { won: true })
    expect(slide(small, 'left').reachedTarget).toBe(false) // already won earlier
  })
})

describe('merge engine – persistence', () => {
  it('round-trips through JSON and rejects malformed data', () => {
    const run = slide(newRun('large', 7), 'up').run
    const restored = parseRun(JSON.parse(JSON.stringify(run)), 'large')
    expect(restored).toEqual(run)
    // Continues identically after "reload".
    expect(slide(restored!, 'left').run).toEqual(slide(run, 'left').run)

    expect(parseRun(run, 'classic')).toBeUndefined()
    expect(parseRun({ ...run, tiles: [{ id: 1, value: 3, cell: 0 }] }, 'large')).toBeUndefined()
    expect(
      parseRun({ ...run, tiles: [{ id: 1, value: 2, cell: 0 }, { id: 2, value: 2, cell: 0 }] }, 'large'),
    ).toBeUndefined()
    expect(parseRun('nope', 'large')).toBeUndefined()
  })
})
