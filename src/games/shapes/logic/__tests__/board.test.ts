import { describe, expect, it } from 'vitest'

import { createBoard, findAnyMove, isValidSwap, listMoves, shuffleBoard } from '../board'
import { findMatches } from '../match'
import { CELLS } from '../types'
import { at, context, isStable, patternBoard, set } from './helpers'

describe('createBoard', () => {
  it('creates stable boards with at least one move', () => {
    for (let seed = 1; seed <= 30; seed++) {
      const board = createBoard(context(seed, seed % 2 ? 5 : 6, 1))
      expect(isStable(board)).toBe(true)
      expect(findAnyMove(board)).not.toBeNull()
    }
  })

  it('uses only the requested kinds and unique ids', () => {
    const board = createBoard(context(9, 5, 1))
    expect(board.every((p) => p!.kind >= 0 && p!.kind < 5)).toBe(true)
    expect(new Set(board.map((p) => p!.id)).size).toBe(CELLS)
  })

  it('is deterministic per seed', () => {
    const kinds = (seed: number) => createBoard(context(seed, 6, 1)).map((p) => p!.kind)
    expect(kinds(42)).toEqual(kinds(42))
    expect(kinds(42)).not.toEqual(kinds(43))
  })
})

describe('moves', () => {
  it('detects valid and invalid swaps', () => {
    // R R . R  → moving the last R left completes a line.
    const board = set(patternBoard(), [
      [3, 0, 'R'],
      [3, 1, 'R'],
      [3, 2, 'B'],
      [3, 3, 'R'],
    ])
    expect(findMatches(board)).toEqual([])
    expect(isValidSwap(board, at(3, 2), at(3, 3))).toBe(true)
    expect(isValidSwap(board, at(0, 0), at(0, 1))).toBe(false)
  })

  it('treats prisms and special pairs as always valid', () => {
    const prism = set(patternBoard(), [[2, 2, '*']])
    expect(isValidSwap(prism, at(2, 2), at(2, 3))).toBe(true)
    const pair = set(patternBoard(), [
      [5, 5, 'Rh'],
      [5, 6, 'Gx'],
    ])
    expect(isValidSwap(pair, at(5, 5), at(5, 6))).toBe(true)
  })

  it('finds no move on the pattern board', () => {
    expect(listMoves(patternBoard())).toEqual([])
    expect(findAnyMove(patternBoard())).toBeNull()
  })
})

describe('shuffleBoard', () => {
  it('turns a dead board into a playable one keeping all pieces', () => {
    const board = patternBoard()
    const ids = board.map((p) => p!.id).sort((a, b) => a - b)
    shuffleBoard(board, context(5))
    expect(isStable(board)).toBe(true)
    expect(findAnyMove(board)).not.toBeNull()
    expect(board.map((p) => p!.id).sort((a, b) => a - b)).toEqual(ids)
  })
})
