import { describe, expect, it } from 'vitest'

import { findMatches, matchesAt, specialForGroup } from '../match'
import { at, patternBoard, set } from './helpers'

describe('findMatches', () => {
  it('finds nothing on the pattern board', () => {
    expect(findMatches(patternBoard())).toEqual([])
  })

  it('finds a horizontal line of three', () => {
    const board = set(patternBoard(), [
      [3, 2, 'R'],
      [3, 3, 'R'],
      [3, 4, 'R'],
    ])
    const groups = findMatches(board)
    expect(groups).toHaveLength(1)
    expect(groups[0]!.cells).toEqual([at(3, 2), at(3, 3), at(3, 4)])
    expect(groups[0]!.shape).toBe('three')
    expect(specialForGroup(groups[0]!)).toBe('none')
  })

  it('classifies four and five in a line', () => {
    const four = set(patternBoard(), [
      [0, 7, 'Y'],
      [1, 7, 'Y'],
      [2, 7, 'Y'],
      [3, 7, 'Y'],
    ])
    const [g4] = findMatches(four)
    expect(g4!.shape).toBe('four')
    expect(g4!.orientation).toBe('v')
    expect(specialForGroup(g4!)).toBe('line-v')

    const five = set(patternBoard(), [
      [5, 0, 'B'],
      [5, 1, 'B'],
      [5, 2, 'B'],
      [5, 3, 'B'],
      [5, 4, 'B'],
    ])
    const [g5] = findMatches(five)
    expect(g5!.shape).toBe('five')
    expect(specialForGroup(g5!)).toBe('prism')
  })

  it('merges crossing runs into L and T shapes', () => {
    const l = set(patternBoard(), [
      [2, 2, 'P'],
      [3, 2, 'P'],
      [4, 2, 'P'],
      [4, 3, 'P'],
      [4, 4, 'P'],
    ])
    const groups = findMatches(l)
    expect(groups).toHaveLength(1)
    expect(groups[0]!.shape).toBe('cross')
    expect(groups[0]!.cells).toHaveLength(5)
    expect(specialForGroup(groups[0]!)).toBe('burst')

    const t = set(patternBoard(), [
      [1, 3, 'O'],
      [1, 4, 'O'],
      [1, 5, 'O'],
      [2, 4, 'O'],
      [3, 4, 'O'],
    ])
    expect(findMatches(t)[0]!.shape).toBe('cross')
  })

  it('keeps separate runs separate', () => {
    const board = set(patternBoard(), [
      [0, 0, 'Y'],
      [0, 1, 'Y'],
      [0, 2, 'Y'],
      [7, 5, 'Y'],
      [7, 6, 'Y'],
      [7, 7, 'Y'],
    ])
    expect(findMatches(board)).toHaveLength(2)
  })

  it('never matches prisms', () => {
    const board = set(patternBoard(), [
      [4, 4, '*'],
      [4, 5, '*'],
      [4, 6, '*'],
    ])
    expect(findMatches(board)).toEqual([])
  })

  it('matchesAt detects membership in a run', () => {
    const board = set(patternBoard(), [
      [6, 1, 'R'],
      [6, 2, 'R'],
      [6, 3, 'R'],
    ])
    expect(matchesAt(board, at(6, 2))).toBe(true)
    expect(matchesAt(board, at(5, 2))).toBe(false)
  })
})
