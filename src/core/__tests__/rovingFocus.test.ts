import { describe, expect, it } from 'vitest'

import { rovingTabindex, rovingTarget } from '../rovingFocus'

describe('roving focus', () => {
  it('moves with arrow keys (wrapping), Home and End', () => {
    expect(rovingTarget('ArrowRight', 0, 3)).toBe(1)
    expect(rovingTarget('ArrowDown', 2, 3)).toBe(0)
    expect(rovingTarget('ArrowLeft', 0, 3)).toBe(2)
    expect(rovingTarget('ArrowUp', 1, 3)).toBe(0)
    expect(rovingTarget('Home', 2, 3)).toBe(0)
    expect(rovingTarget('End', 0, 3)).toBe(2)
    expect(rovingTarget('Enter', 0, 3)).toBeNull()
    expect(rovingTarget('ArrowRight', 0, 0)).toBeNull()
  })

  it('keeps one tab stop: the selected item, else the first', () => {
    expect([0, 1, 2].map((i) => rovingTabindex(i, 1))).toEqual([-1, 0, -1])
    expect([0, 1, 2].map((i) => rovingTabindex(i, -1))).toEqual([0, -1, -1])
  })
})
