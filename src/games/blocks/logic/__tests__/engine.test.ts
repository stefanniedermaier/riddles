import { describe, expect, it } from 'vitest'

import { createRng } from '@/core/rng'
import {
  CELLS,
  CLEAR_BOARD_BONUS,
  SIZE,
  dealTray,
  fitsAnywhere,
  footprint,
  fullLines,
  linePoints,
  newRun,
  parseRun,
  place,
  type BlocksRun,
  type Piece,
} from '../engine'
import { SHAPES, shapeSize } from '../pieces'

/** Index of a shape by its cells (as written in pieces.ts). */
const shapeIndex = (cells: [number, number][]) =>
  SHAPES.findIndex((s) => JSON.stringify(s.cells) === JSON.stringify(cells))

const MONO = shapeIndex([[0, 0]])
const I4H = shapeIndex([[0, 0], [0, 1], [0, 2], [0, 3]])
const I4V = shapeIndex([[0, 0], [1, 0], [2, 0], [3, 0]])
const SQ3 = shapeIndex([[0, 0], [0, 1], [0, 2], [1, 0], [1, 1], [1, 2], [2, 0], [2, 1], [2, 2]])

function runWith(board: number[], tray: (Piece | null)[], extra: Partial<BlocksRun> = {}): BlocksRun {
  return { board, tray, score: 0, combo: 0, moves: 0, lines: 0, rngState: 1, over: false, ...extra }
}

const empty = () => new Array<number>(CELLS).fill(0)

describe('pieces', () => {
  it('are unique, normalised and fit on the board', () => {
    const keys = SHAPES.map((s) => JSON.stringify([...s.cells].sort()))
    expect(new Set(keys).size).toBe(SHAPES.length)
    for (const s of SHAPES) {
      expect(Math.min(...s.cells.map(([r]) => r))).toBe(0)
      expect(Math.min(...s.cells.map(([, c]) => c))).toBe(0)
      const { rows, cols } = shapeSize(s.cells)
      expect(rows).toBeLessThanOrEqual(5)
      expect(cols).toBeLessThanOrEqual(5)
      expect(s.weight).toBeGreaterThan(0)
    }
    expect([MONO, I4H, I4V, SQ3].every((i) => i >= 0)).toBe(true)
  })
})

describe('engine', () => {
  it('computes footprints inside the board only', () => {
    const board = empty()
    expect(footprint(board, { shape: I4H, color: 1 }, 0)).toEqual([0, 1, 2, 3])
    expect(footprint(board, { shape: I4H, color: 1 }, 5)).toBeNull() // runs over the edge
    board[2] = 3
    expect(footprint(board, { shape: I4H, color: 1 }, 0)).toBeNull() // blocked
  })

  it('places a piece and scores one point per cell', () => {
    const result = place(runWith(empty(), [{ shape: I4H, color: 2 }, null, { shape: MONO, color: 1 }]), 0, 9)!
    expect(result.placed).toEqual([9, 10, 11, 12])
    expect(result.run.board.filter((c) => c === 2)).toHaveLength(4)
    expect(result.gained).toBe(4)
    expect(result.run.tray[0]).toBeNull()
    expect(result.run.moves).toBe(1)
  })

  it('rejects placements that do not fit', () => {
    const run = runWith(empty(), [{ shape: I4H, color: 2 }, null, null])
    expect(place(run, 0, 6)).toBeNull()
    expect(place(run, 1, 0)).toBeNull()
  })

  it('clears full rows and columns at once and scores them', () => {
    const board = empty()
    // Row 0 full except cell 0, column 0 full except cell 0.
    for (let i = 1; i < SIZE; i++) {
      board[i] = 1
      board[i * SIZE] = 1
    }
    const result = place(runWith(board, [{ shape: MONO, color: 4 }, { shape: MONO, color: 1 }, null]), 0, 0)!
    expect(result.clearedRows).toEqual([0])
    expect(result.clearedCols).toEqual([0])
    expect(result.clearedCells).toHaveLength(15)
    expect(result.run.board.every((c) => c === 0)).toBe(true)
    expect(result.boardCleared).toBe(true)
    expect(result.gained).toBe(1 + linePoints(2, 1) + CLEAR_BOARD_BONUS)
    expect(result.run.lines).toBe(2)
  })

  it('builds combos with consecutive clears and resets them otherwise', () => {
    expect(linePoints(1, 1)).toBe(10)
    expect(linePoints(2, 1)).toBe(30)
    expect(linePoints(3, 1)).toBe(60)
    expect(linePoints(1, 3)).toBe(30)

    const board = empty()
    for (let c = 1; c < SIZE; c++) board[c] = 1 // row 0 almost full
    board[SIZE * 7] = 5 // keeps the board from being empty after the clear
    const first = place(runWith(board, [{ shape: MONO, color: 1 }, { shape: MONO, color: 1 }, { shape: MONO, color: 1 }], { combo: 1 }), 0, 0)!
    expect(first.combo).toBe(2)
    expect(first.gained).toBe(1 + linePoints(1, 2))
    const second = place(first.run, 1, 20)!
    expect(second.combo).toBe(0)
    expect(second.run.combo).toBe(0)
  })

  it('deals a new tray when the last piece is placed', () => {
    const result = place(runWith(empty(), [null, { shape: MONO, color: 1 }, null], { rngState: 42 }), 1, 0)!
    expect(result.dealt).toBe(true)
    expect(result.run.tray.every((p) => p !== null)).toBe(true)
    expect(result.run.rngState).not.toBe(42)
  })

  it('ends the game when no tray piece fits', () => {
    // Checkerboard: only single cells fit.
    const board = empty().map((_, cell) => ((Math.floor(cell / SIZE) + (cell % SIZE)) % 2 === 0 ? 1 : 0))
    const free = board.indexOf(0)
    const run = runWith(board, [{ shape: MONO, color: 1 }, { shape: I4H, color: 2 }, null])
    const result = place(run, 0, free)!
    expect(result.run.over).toBe(true)
    expect(fitsAnywhere(result.run.board, { shape: I4H, color: 1 })).toBe(false)
  })

  it('always deals a tray with a fitting piece while anything fits', () => {
    const board = empty().map(() => 1)
    board[27] = 0 // a single hole: only the mono piece fits
    for (let seed = 0; seed < 50; seed++) {
      const tray = dealTray(createRng(seed), board)
      expect(tray).toHaveLength(3)
      expect(tray.some((p) => fitsAnywhere(board, p))).toBe(true)
    }
  })

  it('is deterministic per seed and finds full lines', () => {
    expect(newRun(7)).toEqual(newRun(7))
    const board = empty()
    for (let c = 0; c < SIZE; c++) board[3 * SIZE + c] = 1
    expect(fullLines(board)).toEqual({ rows: [3], cols: [] })
  })

  it('plays a whole random game to the end without breaking invariants', () => {
    const rng = createRng(99)
    let run = newRun(123)
    for (let step = 0; step < 2000 && !run.over; step++) {
      const options: [number, number][] = []
      run.tray.forEach((piece, slot) => {
        if (!piece) return
        for (let anchor = 0; anchor < CELLS; anchor++) if (footprint(run.board, piece, anchor)) options.push([slot, anchor])
      })
      expect(options.length).toBeGreaterThan(0)
      const [slot, anchor] = rng.pick(options)
      const result = place(run, slot, anchor)!
      expect(result.run.score).toBe(run.score + result.gained)
      expect(fullLines(result.run.board)).toEqual({ rows: [], cols: [] })
      run = result.run
    }
    expect(run.over).toBe(true)
    expect(run.moves).toBeGreaterThan(3)
  })

  it('lasts a while when played sensibly (greedy bot)', () => {
    const lengths: number[] = []
    for (let seed = 1; seed <= 10; seed++) {
      let run = newRun(seed)
      while (!run.over && run.moves < 400) {
        let best: { result: NonNullable<ReturnType<typeof place>>; value: number } | null = null
        run.tray.forEach((piece, slot) => {
          if (!piece) return
          for (let anchor = 0; anchor < CELLS; anchor++) {
            const result = place(run, slot, anchor)
            if (!result) continue
            // Prefer clears, then few isolated holes (empty cells with no empty neighbour).
            const holes = result.run.board.filter((color, cell) => {
              if (color !== 0) return false
              const r = Math.floor(cell / SIZE)
              const c = cell % SIZE
              return [[r - 1, c], [r + 1, c], [r, c - 1], [r, c + 1]].every(
                ([y, x]) => y! < 0 || y! >= SIZE || x! < 0 || x! >= SIZE || result.run.board[y! * SIZE + x!] !== 0,
              )
            }).length
            const value = result.gained * 10 - holes * 15 - (result.run.over ? 1000 : 0)
            if (!best || value > best.value) best = { result, value }
          }
        })
        run = best!.result.run
      }
      lengths.push(run.moves)
    }
    const average = lengths.reduce((a, b) => a + b, 0) / lengths.length
    expect(average).toBeGreaterThan(40)
  })

  it('validates stored runs', () => {
    const run = newRun(5)
    expect(parseRun(JSON.parse(JSON.stringify(run)))).toEqual(run)
    expect(parseRun({ ...run, board: run.board.slice(1) })).toBeUndefined()
    expect(parseRun({ ...run, tray: [null, null, null] })).toBeUndefined()
    expect(parseRun({ ...run, tray: [{ shape: 999, color: 1 }, null, null] })).toBeUndefined()
    expect(parseRun(null)).toBeUndefined()
  })
})
