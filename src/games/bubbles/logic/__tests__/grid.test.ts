import { describe, expect, it } from 'vitest'

import { CELLS, centre, COLS, isCell, neighbours, ROW_HEIGHT, rowWidth, type Parity } from '../grid'

describe('grid', () => {
  it('has 9 cells in unshifted rows and 8 in shifted ones', () => {
    expect(rowWidth(0, 0)).toBe(9)
    expect(rowWidth(1, 0)).toBe(8)
    expect(rowWidth(0, 1)).toBe(8)
    expect(isCell(8, 0)).toBe(true)
    expect(isCell(COLS + 8, 0)).toBe(false)
    expect(isCell(8, 1)).toBe(false)
    expect(isCell(-1, 0)).toBe(false)
    expect(isCell(CELLS, 0)).toBe(false)
  })

  it('places shifted rows half a bubble to the right', () => {
    expect(centre(0, 0)).toEqual({ x: 0.5, y: 0.5 })
    expect(centre(COLS, 0)).toEqual({ x: 1, y: 0.5 + ROW_HEIGHT })
    expect(centre(0, 1)).toEqual({ x: 1, y: 0.5 })
  })

  it('finds neighbours exactly one diameter away, in both parities', () => {
    for (const parity of [0, 1] as Parity[]) {
      for (let cell = 0; cell < CELLS; cell++) {
        if (!isCell(cell, parity)) continue
        const c = centre(cell, parity)
        const found = neighbours(cell, parity)
        expect(found.length).toBeLessThanOrEqual(6)
        for (const n of found) {
          const d = Math.hypot(centre(n, parity).x - c.x, centre(n, parity).y - c.y)
          expect(d).toBeCloseTo(1, 9)
          expect(neighbours(n, parity)).toContain(cell)
        }
        // And every cell one diameter away is a neighbour.
        const touching = Array.from({ length: CELLS }, (_, other) => other).filter((other) => {
          if (other === cell || !isCell(other, parity)) return false
          const o = centre(other, parity)
          return Math.abs(Math.hypot(o.x - c.x, o.y - c.y) - 1) < 1e-9
        })
        expect([...found].sort((a, b) => a - b)).toEqual(touching)
      }
    }
  })

  it('keeps every bubble in place on screen when a row is pushed in', () => {
    // Row r in parity p is drawn where row r + 1 is drawn in the flipped parity, one row lower.
    for (let cell = 0; cell < CELLS - COLS; cell++) {
      if (!isCell(cell, 0)) continue
      expect(isCell(cell + COLS, 1)).toBe(true)
      expect(centre(cell + COLS, 1).x).toBe(centre(cell, 0).x)
    }
  })
})
