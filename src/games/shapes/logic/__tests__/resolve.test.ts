import { describe, expect, it } from 'vitest'

import { createBoard, findAnyMove, listMoves } from '../board'
import { resolveMove, type ClearPhase, type Phase } from '../resolve'
import { CELLS, type Board } from '../types'
import { at, context, isStable, patternBoard, set } from './helpers'

const clears = (phases: Phase[]) => phases.filter((p): p is ClearPhase => p.type === 'clear')

/** R R B R on row 3: moving (3,3) → (3,2) makes a line of three. */
function threeBoard(): Board {
  return set(patternBoard(), [
    [3, 0, 'R'],
    [3, 1, 'R'],
    [3, 2, 'B'],
    [3, 3, 'R'],
  ])
}

describe('resolveMove', () => {
  it('rejects swaps that do not match and leaves the board untouched', () => {
    const board = patternBoard()
    const result = resolveMove(board, at(0, 0), at(0, 1), context())
    expect(result.valid).toBe(false)
    expect(result.board).toBe(board)
    expect(result.phases).toEqual([{ type: 'swap', a: at(0, 0), b: at(0, 1), valid: false }])
  })

  it('rejects non-adjacent swaps', () => {
    expect(resolveMove(threeBoard(), at(3, 3), at(3, 1), context()).valid).toBe(false)
  })

  it('clears a line of three and refills the board', () => {
    const board = threeBoard()
    const before = board.slice()
    const result = resolveMove(board, at(3, 3), at(3, 2), context())
    expect(result.valid).toBe(true)
    expect(board).toEqual(before) // input not mutated
    const [first] = clears(result.phases)
    expect(first!.cells).toEqual([at(3, 0), at(3, 1), at(3, 2)])
    expect(first!.score).toBe(30)
    expect(first!.cascade).toBe(1)
    expect(result.phases[0]).toEqual({ type: 'swap', a: at(3, 3), b: at(3, 2), valid: true })
    expect(result.phases[2]!.type).toBe('fall')
    expect(isStable(result.board)).toBe(true)
    expect(findAnyMove(result.board)).not.toBeNull()
    expect(result.summary.clearedByKind[0]).toBeGreaterThanOrEqual(3)
  })

  it('creates a line special from four in a row at the moved position', () => {
    const board = set(patternBoard(), [
      [3, 0, 'R'],
      [3, 1, 'R'],
      [3, 2, 'B'],
      [3, 3, 'R'],
      [2, 2, 'R'],
    ])
    // Move (2,2) down into (3,2): R R R R on row 3.
    const result = resolveMove(board, at(2, 2), at(3, 2), context())
    const [first] = clears(result.phases)
    expect(first!.created).toHaveLength(1)
    expect(first!.created[0]!.cell).toBe(at(3, 2))
    expect(first!.created[0]!.piece.special).toBe('line-h')
    expect(first!.created[0]!.piece.kind).toBe(0)
    expect(first!.cells).not.toContain(at(3, 2))
    expect(result.summary.specialsCreated).toBeGreaterThanOrEqual(1)
  })

  it('creates a burst from an L shape and a prism from five', () => {
    const l = set(patternBoard(), [
      [1, 4, 'G'],
      [2, 4, 'G'],
      [3, 2, 'G'],
      [3, 3, 'G'],
      [3, 4, 'B'],
      [3, 5, 'G'],
    ])
    // Move (3,5) left into (3,4): G G G on row 3 plus G G above → L/T shape.
    const lr = resolveMove(l, at(3, 5), at(3, 4), context())
    expect(clears(lr.phases)[0]!.created[0]!.piece.special).toBe('burst')

    const five = set(patternBoard(), [
      [6, 1, 'Y'],
      [6, 2, 'Y'],
      [6, 3, 'B'],
      [6, 4, 'Y'],
      [6, 5, 'Y'],
      [5, 3, 'Y'],
    ])
    const fr = resolveMove(five, at(5, 3), at(6, 3), context())
    const created = clears(fr.phases)[0]!.created[0]!
    expect(created.piece.special).toBe('prism')
    expect(created.piece.kind).toBe(-1)
    expect(created.cell).toBe(at(6, 3))
  })

  it('fires a line special that is part of a match', () => {
    const board = set(patternBoard(), [
      [3, 0, 'Rh'],
      [3, 1, 'R'],
      [3, 2, 'B'],
      [3, 3, 'R'],
    ])
    const result = resolveMove(board, at(3, 3), at(3, 2), context())
    const [first] = clears(result.phases)
    // The whole row is cleared: 3 matched + 5 by the line effect.
    expect(first!.cells).toEqual(Array.from({ length: 8 }, (_, c) => at(3, c)))
    expect(first!.triggered).toEqual([at(3, 0)])
    expect(first!.score).toBe(30 + 5 * 10)
  })

  it('chains specials hit by other specials', () => {
    const board = set(patternBoard(), [
      [3, 0, 'Rh'],
      [3, 1, 'R'],
      [3, 2, 'B'],
      [3, 3, 'R'],
      [3, 6, 'Gv'],
    ])
    const result = resolveMove(board, at(3, 3), at(3, 2), context())
    const [first] = clears(result.phases)
    expect(first!.triggered).toEqual([at(3, 0), at(3, 6)])
    for (let row = 0; row < 8; row++) expect(first!.cells).toContain(at(row, 6))
  })

  it('prism + regular piece clears every piece of that kind', () => {
    const board = set(patternBoard(), [[4, 4, '*']])
    const partnerKind = board[at(4, 5)]!.kind
    const kindCount = board.filter((p) => p!.kind === partnerKind).length
    const result = resolveMove(board, at(4, 4), at(4, 5), context())
    expect(result.valid).toBe(true)
    const [first] = clears(result.phases)
    expect(first!.cells).toHaveLength(kindCount + 1)
    expect(result.summary.clearedByKind[partnerKind]).toBeGreaterThanOrEqual(kindCount)
  })

  it('prism + prism clears the whole board', () => {
    const board = set(patternBoard(), [
      [0, 0, '*'],
      [0, 1, '*'],
    ])
    const result = resolveMove(board, at(0, 0), at(0, 1), context())
    expect(clears(result.phases)[0]!.cells).toHaveLength(CELLS)
  })

  it('line + line clears a row and a column; burst + burst a 5×5 area', () => {
    const lines = set(patternBoard(), [
      [4, 4, 'Rh'],
      [4, 5, 'Gv'],
    ])
    const lr = resolveMove(lines, at(4, 4), at(4, 5), context())
    expect(clears(lr.phases)[0]!.cells).toHaveLength(15)

    const bursts = set(patternBoard(), [
      [4, 4, 'Rx'],
      [4, 5, 'Gx'],
    ])
    const br = resolveMove(bursts, at(4, 4), at(4, 5), context())
    expect(clears(br.phases)[0]!.cells).toHaveLength(25)

    const mixed = set(patternBoard(), [
      [4, 4, 'Rx'],
      [4, 5, 'Gh'],
    ])
    const mr = resolveMove(mixed, at(4, 4), at(4, 5), context())
    // 3 rows + 3 columns of an 8×8 board, overlapping in 9 cells.
    expect(clears(mr.phases)[0]!.cells).toHaveLength(3 * 8 + 3 * 8 - 9)
  })

  it('applies the cascade multiplier and always ends on a stable, playable board', () => {
    let sawCascade = false
    for (let seed = 1; seed <= 40; seed++) {
      const ctx = context(seed, 5, 1)
      let board = createBoard(ctx)
      for (let turn = 0; turn < 6; turn++) {
        const move = listMoves(board)[0]!
        const result = resolveMove(board, move.a, move.b, ctx)
        expect(result.valid).toBe(true)
        expect(isStable(result.board)).toBe(true)
        expect(findAnyMove(result.board)).not.toBeNull()
        for (const phase of clears(result.phases)) {
          expect(phase.cascade).toBeGreaterThanOrEqual(1)
          if (phase.cascade > 1) sawCascade = true
        }
        expect(result.summary.score).toBe(
          clears(result.phases).reduce((sum, phase) => sum + phase.score, 0),
        )
        const ids = result.board.map((p) => p!.id)
        expect(new Set(ids).size).toBe(CELLS)
        board = result.board
      }
    }
    expect(sawCascade).toBe(true)
  })

  it('is deterministic for the same context', () => {
    const run = () => {
      const ctx = context(77, 6, 1)
      const board = createBoard(ctx)
      const move = listMoves(board)[0]!
      return resolveMove(board, move.a, move.b, ctx)
    }
    expect(run()).toEqual(run())
  })
})
