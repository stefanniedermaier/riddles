import { describe, expect, it } from 'vitest'

import { emptyCells } from '../engine'
import { centre, COLS, RADIUS, SHOOTER_X, SHOOTER_Y } from '../grid'
import { angleTowards, clampAngle, COLLIDE, landingCell, MAX_ANGLE, MIN_ANGLE, trace } from '../trace'
import { EMPTY } from '../types'

const row = (r: number, ...cols: number[]) => cols.map((c) => r * COLS + c)

function field(...cells: number[]): number[] {
  const result = emptyCells()
  for (const cell of cells) result[cell] = 0
  return result
}

describe('trace', () => {
  it('flies straight up to the ceiling and snaps into the cell above the shooter', () => {
    const t = trace(emptyCells(), 0, 90)
    expect(t.points).toHaveLength(2)
    expect(t.points[1]!.x).toBeCloseTo(SHOOTER_X)
    expect(t.points[1]!.y).toBeCloseTo(RADIUS)
    expect(t.hit).toBe(-1)
    expect(t.cell).toBe(4)
  })

  it('bounces off the side walls', () => {
    const t = trace(emptyCells(), 0, 30)
    expect(t.points.length).toBeGreaterThan(2)
    expect(t.points[1]!.x).toBeCloseTo(COLS - RADIUS)
    // Several bounces at a flat angle, alternating sides.
    const flat = trace(emptyCells(), 0, 12)
    const xs = flat.points.slice(1, -1).map((p) => p.x)
    expect(xs.length).toBeGreaterThan(3)
    xs.forEach((x, i) => expect(x).toBeCloseTo(i % 2 === 0 ? COLS - RADIUS : RADIUS))
  })

  it('stops at the first bubble and lands in a free cell next to it', () => {
    const cells = field(...row(0, 0, 1, 2, 3, 4, 5, 6, 7, 8))
    const t = trace(cells, 0, 90)
    expect(t.hit).toBe(4)
    const end = t.points[t.points.length - 1]!
    const hit = centre(4, 0)
    expect(Math.hypot(end.x - hit.x, end.y - hit.y)).toBeCloseTo(COLLIDE)
    expect(cells[t.cell]).toBe(EMPTY)
    expect([COLS + 3, COLS + 4]).toContain(t.cell)
  })

  it('slips through a gap that is wide enough', () => {
    // Row 2 (unshifted) has bubbles at x = 3.5 and 5.5; straight up (x = 4.5) passes between
    // them – they are a whole diameter away – and hits the ceiling row.
    const cells = field(...row(0, 0, 1, 2, 3, 4, 5, 6, 7, 8), ...row(2, 3, 5))
    const t = trace(cells, 0, 90)
    expect(t.hit).toBe(4)
    expect([COLS + 3, COLS + 4]).toContain(t.cell)
  })

  it('never ends in an occupied cell, for any angle', () => {
    const cells = field(...row(0, 0, 1, 2, 3, 4, 5, 6, 7, 8), ...row(1, 0, 2, 4, 6), ...row(2, 1, 5, 7))
    for (let angle = MIN_ANGLE; angle <= MAX_ANGLE; angle += 0.5) {
      const t = trace(cells, 0, angle)
      expect(t.cell).toBeGreaterThanOrEqual(0)
      expect(cells[t.cell]).toBe(EMPTY)
    }
  })

  it('clamps the angle', () => {
    expect(clampAngle(0)).toBe(MIN_ANGLE)
    expect(clampAngle(200)).toBe(MAX_ANGLE)
    expect(angleTowards({ x: SHOOTER_X, y: 0 })).toBeCloseTo(90)
    expect(angleTowards({ x: 0, y: SHOOTER_Y + 1 })).toBe(MAX_ANGLE)
    expect(angleTowards({ x: COLS, y: SHOOTER_Y + 1 })).toBe(MIN_ANGLE)
  })
})

describe('landingCell', () => {
  it('only chooses cells that hold on (ceiling or a neighbour)', () => {
    expect(landingCell(emptyCells(), 0, { x: 4.5, y: 5 })).toBeLessThan(COLS)
  })
})
