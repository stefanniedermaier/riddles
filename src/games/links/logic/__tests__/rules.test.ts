import { describe, expect, it } from 'vitest'

import {
  applyHint,
  beginStroke,
  connectedCount,
  countMove,
  coveredCells,
  extendStroke,
  hintColor,
  isConnected,
  isSolved,
  sameLine,
  strokePaths,
} from '../rules'
import { SMALL } from './helpers'

const empty = () => SMALL.endpoints.map(() => [] as number[])

describe('links rules – strokes', () => {
  it('draws from a dot to the other dot and stops there', () => {
    const stroke = beginStroke(SMALL, empty(), 0)!
    expect(stroke.color).toBe(0)
    expect(extendStroke(SMALL, stroke, 1)).toBe(true)
    expect(extendStroke(SMALL, stroke, 2)).toBe(true)
    expect(isConnected(SMALL, 0, stroke.path)).toBe(true)
    expect(extendStroke(SMALL, stroke, 5)).toBe(false)
    expect(stroke.path).toEqual([0, 1, 2])
  })

  it('cannot enter a dot of another colour', () => {
    const stroke = beginStroke(SMALL, empty(), 0)!
    expect(extendStroke(SMALL, stroke, 3)).toBe(false)
    expect(stroke.path).toEqual([0])
  })

  it('shortens when dragging back over the own line', () => {
    const stroke = beginStroke(SMALL, empty(), 3)!
    extendStroke(SMALL, stroke, 4)
    extendStroke(SMALL, stroke, 5)
    extendStroke(SMALL, stroke, 4)
    expect(stroke.path).toEqual([3, 4])
  })

  it('cuts other lines and restores them when pulled back', () => {
    const paths = empty()
    paths[1] = [3, 4, 5]
    const stroke = beginStroke(SMALL, paths, 0)!
    extendStroke(SMALL, stroke, 1)
    extendStroke(SMALL, stroke, 4)
    expect(strokePaths(stroke)[1]).toEqual([3])
    extendStroke(SMALL, stroke, 1)
    expect(strokePaths(stroke)[1]).toEqual([3, 4, 5])
  })

  it('continues an open line from its end or from a cell in the middle', () => {
    const paths = empty()
    paths[1] = [3, 4, 5]
    expect(beginStroke(SMALL, paths, 5)!.path).toEqual([3, 4, 5])
    expect(beginStroke(SMALL, paths, 4)!.path).toEqual([3, 4])
    expect(beginStroke(SMALL, paths, 5)!.color).toBe(1)
  })

  it('restarts a line when its starting dot is pressed', () => {
    const paths = empty()
    paths[1] = [3, 4, 5]
    expect(beginStroke(SMALL, paths, 3)!.path).toEqual([3])
    // The far dot of a connected line restarts from there.
    paths[0] = [0, 1, 2]
    expect(beginStroke(SMALL, paths, 2)!.path).toEqual([2])
  })

  it('ignores presses on empty cells', () => {
    expect(beginStroke(SMALL, empty(), 4)).toBeNull()
  })

  it('walks through skipped cells of fast drags', () => {
    const stroke = beginStroke(SMALL, empty(), 0)!
    expect(extendStroke(SMALL, stroke, 2)).toBe(true)
    expect(stroke.path).toEqual([0, 1, 2])
  })
})

describe('links rules – state', () => {
  it('counts connections, coverage and detects the solution', () => {
    const paths = SMALL.solution.map((p) => p.slice())
    expect(connectedCount(SMALL, paths)).toBe(3)
    expect(coveredCells(paths)).toBe(9)
    expect(isSolved(SMALL, paths)).toBe(true)
    // Reversed lines are fine too.
    paths[1] = paths[1]!.slice().reverse()
    expect(isSolved(SMALL, paths)).toBe(true)
    paths[2] = [6]
    expect(isSolved(SMALL, paths)).toBe(false)
  })

  it('compares lines regardless of direction', () => {
    expect(sameLine([1, 2, 3], [3, 2, 1])).toBe(true)
    expect(sameLine([1, 2, 3], [1, 2])).toBe(false)
  })
})

describe('links rules – hints and moves', () => {
  it('reveals a wrong, unconnected colour first and cuts lines in its way', () => {
    const paths = empty()
    paths[0] = [0] // A is open
    paths[1] = [3, 4, 1] // B runs through a cell of A's solution
    const color = hintColor(SMALL, paths)
    expect(color).toBe(0)
    const next = applyHint(SMALL, paths, color!)
    expect(next[0]).toEqual([0, 1, 2])
    expect(next[1]).toEqual([3, 4])
  })

  it('has no hint when every line is correct', () => {
    expect(hintColor(SMALL, SMALL.solution)).toBeNull()
  })

  it('counts a move only when the colour changes', () => {
    let state = countMove(0, null, 1)
    expect(state).toEqual({ moves: 1, lastColor: 1 })
    state = countMove(state.moves, state.lastColor, 1)
    expect(state.moves).toBe(1)
    state = countMove(state.moves, state.lastColor, 2)
    expect(state.moves).toBe(2)
  })
})
