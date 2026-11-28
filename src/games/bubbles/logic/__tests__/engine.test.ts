import { describe, expect, it } from 'vitest'

import {
  basePoints,
  BOMB_COMBO,
  CLEAR_BONUS,
  comboMultiplier,
  dropInterval,
  emptyCells,
  fieldColors,
  floating,
  goalReached,
  levelBonus,
  lowestRow,
  missLimit,
  newRun,
  parseRun,
  place,
  pushRow,
  rainbowColor,
  shoot,
  starsFor,
  swap,
  tick,
  type BubblesRun,
  type LevelSetup,
} from '../engine'
import { CELLS, COLS, isCell, LIMIT } from '../grid'
import { trace } from '../trace'
import { BOMB, EMPTY, RAINBOW, STONE } from '../types'

const at = (r: number, c: number) => r * COLS + c

function cellsWith(entries: [number, number][]): number[] {
  const cells = emptyCells()
  for (const [cell, value] of entries) cells[cell] = value
  return cells
}

function runWith(overrides: Partial<BubblesRun>): BubblesRun {
  return { ...newRun('endless', 1), ...overrides }
}

/** An angle whose shot lands in `cell`. */
function findAngle(cells: readonly number[], cell: number): number {
  for (let angle = 10; angle <= 170; angle += 0.25) if (trace(cells, 0, angle).cell === cell) return angle
  throw new Error(`No angle reaches ${cell}`)
}

/** Full ceiling row of one colour, so the field holds and does not pop by accident. */
const ceiling = (color: number): [number, number][] => Array.from({ length: COLS }, (_, c) => [at(0, c), color])

describe('newRun', () => {
  it('fills the top rows and offers colours from the field', () => {
    const run = newRun('endless', 7)
    expect(lowestRow(run.cells)).toBe(5)
    expect(fieldColors(run.cells)).toContain(run.current)
    expect(fieldColors(run.cells)).toContain(run.next)
    expect(run.shotsLeft).toBe(-1)
    expect(newRun('time', 7, { speed: 'fast' }).speed).toBe('fast')
    expect(newRun('endless', 7, { speed: 'fast' }).speed).toBe('normal')
  })

  it('is the same for the same seed', () => {
    expect(newRun('endless', 3)).toEqual(newRun('endless', 3))
    expect(newRun('time', 3)).not.toEqual(newRun('time', 4))
  })

  it('needs a level setup for the levels mode', () => {
    expect(() => newRun('levels', 1)).toThrow()
  })
})

describe('place', () => {
  it('pops three or more of a colour and drops what no longer holds', () => {
    // Ceiling of colour 1; below it two 0s, under them a 2 that hangs only on the 0s.
    const cells = cellsWith([...ceiling(1), [at(1, 3), 0], [at(1, 4), 0], [at(2, 4), 2]])
    const result = place(cells, 0, at(2, 3), 0)
    // Row 2 col 3 touches row 1 col 3 (shifted row 1: up-neighbours of an unshifted row 2 are
    // cols 2 and 3) – only one 0 directly, but the group runs on to row 1 col 4.
    expect(result.popped.map((b) => b.cell).sort((a, b) => a - b)).toEqual([at(1, 3), at(1, 4), at(2, 3)])
    expect(result.fallen.map((b) => b.cell)).toEqual([at(2, 4)])
    expect(result.cells[at(2, 4)]).toBe(EMPTY)
    expect(result.cells[at(0, 0)]).toBe(1)
  })

  it('keeps two of a colour and drops nothing', () => {
    const cells = cellsWith([...ceiling(1), [at(1, 3), 0]])
    const result = place(cells, 0, at(1, 4), 0)
    expect(result.popped).toEqual([])
    expect(result.fallen).toEqual([])
    expect(result.cells[at(1, 4)]).toBe(0)
  })

  it('never pops stones; they only fall', () => {
    const cells = cellsWith([...ceiling(1), [at(1, 3), 0], [at(1, 4), 0], [at(2, 4), STONE]])
    const result = place(cells, 0, at(2, 3), 0)
    expect(result.popped.some((b) => b.value === STONE)).toBe(false)
    expect(result.fallen).toEqual([{ cell: at(2, 4), value: STONE }])
  })

  it('blasts the six cells around a bomb, stones included', () => {
    const cells = cellsWith([...ceiling(1), [at(1, 3), STONE], [at(1, 4), 2]])
    const result = place(cells, 0, at(2, 4), BOMB)
    const popped = result.popped.map((b) => b.cell)
    expect(popped).toContain(at(1, 3))
    expect(popped).toContain(at(1, 4))
    expect(result.cells[at(2, 4)]).toBe(EMPTY)
  })

  it('gives a rainbow the colour of the biggest touching group', () => {
    const cells = cellsWith([...ceiling(1), [at(1, 3), 0], [at(1, 4), 0]])
    // Next to row 1 col 4: the ceiling (colour 1, 9 bubbles) and the 0s (2 bubbles).
    expect(rainbowColor(cells, 0, at(1, 5), 3)).toBe(1)
    expect(rainbowColor(emptyCells(), 0, at(0, 4), 3)).toBe(3)
    const result = place(cells, 0, at(2, 4), RAINBOW)
    expect(result.placedAs).toBe(0)
    expect(result.popped).toHaveLength(3)
  })
})

describe('floating', () => {
  it('finds bubbles that are not connected to the ceiling', () => {
    const cells = cellsWith([[at(0, 0), 1], [at(1, 0), 1], [at(3, 4), 2]])
    expect(floating(cells, 0)).toEqual([at(3, 4)])
  })
})

describe('scoring', () => {
  it('counts pops, rising points for falls and a combo multiplier', () => {
    expect(basePoints(3, 0)).toBe(30)
    expect(basePoints(3, 3)).toBe(30 + 20 + 40 + 60)
    expect(basePoints(0, 30)).toBeLessThanOrEqual(30 * 400)
    expect(comboMultiplier(1)).toBe(1)
    expect(comboMultiplier(3)).toBe(1.5)
    expect(comboMultiplier(50)).toBe(3)
  })

  it('awards stars by shots used', () => {
    expect(starsFor(10, 10, 20)).toBe(3)
    expect(starsFor(15, 10, 20)).toBe(2)
    expect(starsFor(16, 10, 20)).toBe(1)
    expect(levelBonus({ shotsLeft: 3 })).toBe(300)
    expect(levelBonus({ shotsLeft: -1 })).toBe(0)
  })
})

describe('shoot', () => {
  it('pops a group hit straight on and scores it', () => {
    const cells = cellsWith([...ceiling(1), [at(1, 3), 0], [at(1, 4), 0]])
    const run = runWith({ cells, current: 0, next: 1 })
    const result = shoot(run, 90)
    expect(result.popped).toHaveLength(3)
    expect(result.points).toBe(30)
    expect(result.run.score).toBe(30)
    expect(result.run.combo).toBe(1)
    expect(result.run.shots).toBe(1)
    expect(result.run.current).toBe(1)
  })

  it('counts a miss and pushes a new row after enough misses (endless)', () => {
    let run = runWith({ cells: cellsWith(ceiling(1)), current: 0, next: 0, colors: 2 })
    for (let i = 0; i < missLimit(0) - 1; i++) {
      // Alternate angles so the misses do not stack up into a pop.
      const result = shoot({ ...run, current: i % 2 === 0 ? 0 : 2 }, i % 2 === 0 ? 60 : 120)
      run = result.run
      expect(result.pushed).toBe(false)
    }
    expect(run.misses).toBe(missLimit(0) - 1)
    const last = shoot({ ...run, current: 3 }, 90)
    expect(last.pushed).toBe(true)
    expect(last.run.misses).toBe(0)
    expect(last.run.rows).toBe(1)
    expect(last.run.parity).toBe(1)
  })

  it('ends the run when a bubble passes the danger line', () => {
    const cells = emptyCells()
    for (let r = 0; r < LIMIT; r++) for (let c = 0; c < COLS; c++) if (isCell(at(r, c), 0)) cells[at(r, c)] = (r + c) % 2 === 0 ? 1 : 2
    const run = runWith({ cells, current: 3, next: 3 })
    const result = shoot(run, 90)
    expect(result.cell).toBeGreaterThanOrEqual(LIMIT * COLS)
    expect(result.run.over).toBe(true)
    expect(result.run.won).toBe(false)
  })

  it('refills an empty field with a bonus (endless)', () => {
    const cells = cellsWith([[at(0, 3), 0], [at(0, 4), 0]])
    const result = shoot(runWith({ cells, current: 0, next: 0 }), 90)
    expect(result.cleared).toBe(true)
    expect(result.run.score).toBe(30 + CLEAR_BONUS)
    expect(lowestRow(result.run.cells)).toBeGreaterThan(0)
  })

  it('earns a bomb every few hits in a row and a rainbow for a big drop', () => {
    const cells = cellsWith([...ceiling(1), [at(1, 3), 0], [at(1, 4), 0]])
    const bomb = shoot(runWith({ cells, current: 0, next: 1, combo: BOMB_COMBO - 1 }), 90)
    expect(bomb.earned).toBe(BOMB)
    expect(bomb.run.next).toBe(BOMB)
    // Two 0s on the ceiling hold up a row of seven 2s and three more below them.
    const hanging = cellsWith([
      [at(0, 7), 0],
      [at(0, 8), 0],
      ...[0, 1, 2, 3, 4, 5, 6].map((c): [number, number] => [at(1, c), 2]),
      [at(2, 0), 2],
      [at(2, 1), 2],
      [at(2, 2), 2],
    ])
    const angle = findAngle(hanging, at(1, 7))
    const result = shoot(runWith({ cells: hanging, current: 0, next: 1 }), angle)
    expect(result.popped).toHaveLength(3)
    expect(result.fallen).toHaveLength(10)
    expect(result.earned).toBe(RAINBOW)
    expect(swap({ ...result.run, current: 0, next: 1 })).toMatchObject({ current: 1, next: 0 })
  })

  it('only offers colours that are still on the field', () => {
    const cells = cellsWith([...ceiling(1), [at(1, 3), 0], [at(1, 4), 0]])
    // The waiting bubble is a 0; after the 0s pop, it is replaced by a colour on the field.
    const result = shoot(runWith({ cells, current: 0, next: 0 }), 90)
    expect(result.run.current).toBe(1)
    expect(result.run.next).toBe(1)
  })

  it('does nothing once the run is over', () => {
    const run = runWith({ over: true })
    expect(shoot(run, 90).run).toBe(run)
  })
})

describe('levels mode', () => {
  const setup = (goal: LevelSetup['goal'], shots = 5, extra: Partial<LevelSetup> = {}): LevelSetup => ({
    level: 1,
    seed: 5,
    colors: 2,
    cells: cellsWith([...ceiling(1), [at(1, 3), 0], [at(1, 4), 0]]),
    marked: [],
    goal,
    shots,
    ...extra,
  })

  it('wins when the goal is reached', () => {
    const run = { ...newRun('levels', 0, { level: setup({ type: 'color', color: 0, count: 3 }) }), current: 0 }
    const result = shoot(run, 90)
    expect(result.run.over).toBe(true)
    expect(result.run.won).toBe(true)
    expect(goalReached(result.run)).toBe(true)
  })

  it('counts marked bubbles that are brought down', () => {
    const run = { ...newRun('levels', 0, { level: setup({ type: 'free', count: 1 }, 5, { marked: [at(1, 3)] }) }), current: 0 }
    const result = shoot(run, 90)
    expect(result.run.progress).toBe(1)
    expect(result.run.marked).toEqual([])
    expect(result.run.won).toBe(true)
  })

  it('loses when the shots run out', () => {
    const run = { ...newRun('levels', 0, { level: setup({ type: 'score', target: 10_000 }, 1) }), current: 1 }
    const result = shoot(run, 60)
    expect(result.run.shotsLeft).toBe(0)
    expect(result.run.over).toBe(true)
    expect(result.run.won).toBe(false)
  })

  it('never pushes rows', () => {
    let run = { ...newRun('levels', 0, { level: setup({ type: 'score', target: 10_000 }, 20) }) }
    for (let i = 0; i < 8; i++) run = shoot({ ...run, current: 1 }, i % 2 ? 40 : 140).run
    expect(run.rows).toBe(0)
  })
})

describe('time mode', () => {
  it('drops the ceiling on the clock, faster with every drop', () => {
    const run = newRun('time', 2, { speed: 'normal' })
    const interval = dropInterval(run)
    expect(interval).toBe(14_000)
    expect(tick(run, interval - 1).pushed).toBe(false)
    const { run: after, pushed } = tick(run, interval + 5)
    expect(pushed).toBe(true)
    expect(after.rows).toBe(1)
    expect(after.clockMs).toBe(5)
    expect(dropInterval(after)).toBeLessThan(interval)
    expect(dropInterval({ speed: 'fast', rows: 1000 })).toBe(6_000)
    expect(dropInterval({ speed: 'slow', rows: 0 })).toBe(20_000)
  })

  it('ignores the clock in the other modes', () => {
    const run = newRun('endless', 2)
    expect(tick(run, 1e9).run).toBe(run)
  })

  it('has no specials', () => {
    const cells = cellsWith([...ceiling(1), [at(1, 3), 0], [at(1, 4), 0]])
    const run = { ...newRun('time', 1), cells, current: 0, next: 1, combo: BOMB_COMBO - 1 }
    expect(shoot(run, 90).earned).toBeNull()
  })
})

describe('pushRow', () => {
  it('moves every bubble one row down and flips the parity', () => {
    const run = runWith({ cells: cellsWith(ceiling(1)), marked: [at(0, 2)] })
    const pushed = pushRow(run)
    for (let c = 0; c < COLS; c++) expect(pushed.cells[at(1, c)]).toBe(1)
    expect(pushed.parity).toBe(1)
    expect(pushed.cells.slice(0, 8).every((v) => v !== EMPTY)).toBe(true)
    expect(pushed.cells[8]).toBe(EMPTY)
    expect(pushed.marked).toEqual([at(1, 2)])
  })

  it('ends the run when the field reaches the danger line', () => {
    const cells = emptyCells()
    for (let c = 0; c < COLS; c++) cells[at(LIMIT - 1, c)] = isCell(at(LIMIT - 1, c), 0) ? 1 : EMPTY
    for (let r = 0; r < LIMIT - 1; r++) cells[at(r, 0)] = 1
    expect(pushRow(runWith({ cells })).over).toBe(true)
  })
})

describe('parseRun', () => {
  it('accepts a saved run and rejects broken ones', () => {
    const run = shoot(newRun('endless', 9), 80).run
    const copy = JSON.parse(JSON.stringify(run)) as unknown
    expect(parseRun(copy, 'endless')).toEqual(run)
    expect(parseRun(copy, 'time')).toBeUndefined()
    expect(parseRun({ ...run, cells: run.cells.slice(1) }, 'endless')).toBeUndefined()
    expect(parseRun({ ...run, current: 42 }, 'endless')).toBeUndefined()
    expect(parseRun({ ...run, over: true }, 'endless')).toBeUndefined()
    const bad = [...run.cells]
    bad[8 + COLS * (run.parity === 0 ? 1 : 0)] = 1
    expect(parseRun({ ...run, cells: bad }, 'endless')).toBeUndefined()
    expect(parseRun(null, 'endless')).toBeUndefined()
    expect(CELLS).toBe(run.cells.length)
  })

  it('continues a reloaded run exactly', () => {
    const run = newRun('endless', 11)
    const reloaded = parseRun(JSON.parse(JSON.stringify(run)), 'endless')!
    expect(shoot(reloaded, 70)).toEqual(shoot(run, 70))
  })
})
