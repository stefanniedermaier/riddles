import { describe, expect, it } from 'vitest'

import { createRng } from '@/core/rng'
import { adjacentCounts, neighbourTable } from '../board'
import { findStep, solveBoard, type Knowledge } from '../solver'

/** Knowledge from a picture: digits = revealed numbers, `F` = known mine, `#` = unknown. */
function knowledge(rows: string[], totalMines: number): Knowledge {
  const width = rows[0]!.length
  const height = rows.length
  const numbers = new Int8Array(width * height).fill(-1)
  const mines = new Uint8Array(width * height)
  rows.forEach((row, r) =>
    [...row].forEach((ch, c) => {
      const cell = r * width + c
      if (/\d/.test(ch)) numbers[cell] = Number(ch)
      else if (ch === 'F') mines[cell] = 1
    }),
  )
  return { width, height, numbers, mines, totalMines }
}

/** All mine layouts consistent with the knowledge (brute force, small boards only). */
function consistentLayouts(k: Knowledge): Uint8Array[] {
  const table = neighbourTable(k.width, k.height)
  const unknown = [...k.numbers.keys()].filter((cell) => k.numbers[cell] === -1 && !k.mines[cell])
  const layouts: Uint8Array[] = []
  for (let mask = 0; mask < 1 << unknown.length; mask++) {
    const layout = Uint8Array.from(k.mines)
    unknown.forEach((cell, i) => (layout[cell] = (mask >> i) & 1))
    if (layout.reduce((a, b) => a + b, 0) !== k.totalMines) continue
    const ok = [...k.numbers.keys()].every(
      (cell) => k.numbers[cell] === -1 || (!layout[cell] && table[cell]!.filter((n) => layout[n]).length === k.numbers[cell]),
    )
    if (ok) layouts.push(layout)
  }
  return layouts
}

describe('mines solver techniques', () => {
  it('technique 1: a satisfied number frees its neighbours, a full one marks mines', () => {
    expect(findStep(knowledge(['1F#', '111', '000'], 1))).toMatchObject({ technique: 1, safe: [2], mines: [] })
    expect(findStep(knowledge(['#1', '11'], 1))).toMatchObject({ technique: 1, safe: [], mines: [0] })
  })

  it('technique 2: the 1-2 pattern on an edge', () => {
    // Bottom row: 1 2 1 below three unknown cells → outer cells are mines, middle safe.
    const k = knowledge(['###', '121', '000'], 2)
    const step = findStep(k)!
    expect(step.technique).toBe(2)
    expect(findStep(k, 1)).toBeNull()
    // Solution: mines at both ends, the middle is safe.
    for (const cell of step.mines) expect([0, 2]).toContain(cell)
    for (const cell of step.safe) expect(cell).toBe(1)
  })

  it('technique 4: counting the mines left', () => {
    // Cells no number touches: only the mine count decides.
    const none = knowledge(['F##', '###'], 1)
    expect(findStep(none, 3)).toBeNull()
    expect(findStep(none)).toMatchObject({ technique: 4, safe: [1, 2, 3, 4, 5], mines: [] })
    const all = knowledge(['##', '##'], 4)
    expect(findStep(all)).toMatchObject({ technique: 4, safe: [], mines: [0, 1, 2, 3] })
    // The 1 takes exactly one of its two cells; the mine count decides the cells far away.
    const one = knowledge(['#1###'], 1)
    expect(findStep(one, 3)).toBeNull()
    expect(findStep(one)).toMatchObject({ technique: 4, safe: [3, 4], mines: [] })
    expect(findStep(knowledge(['#1###'], 3))).toMatchObject({ technique: 4, safe: [], mines: [3, 4] })
  })

  it('every deduction holds in all consistent layouts (random positions vs. brute force)', () => {
    const rng = createRng(7)
    let checked = 0
    const used = new Set<number>()
    for (let round = 0; round < 1500; round++) {
      const width = rng.range(3, 5)
      const height = rng.range(3, 4)
      const total = width * height
      const mineCount = rng.range(1, Math.floor(total / 3))
      const mines = rng.shuffle([...Array(total).keys()]).slice(0, mineCount)
      const isMine = new Uint8Array(total)
      for (const m of mines) isMine[m] = 1
      const counts = adjacentCounts(width, height, mines)
      // Reveal a random part of the safe cells and know a random part of the mines.
      const k: Knowledge = {
        width,
        height,
        numbers: Int8Array.from({ length: total }, (_, cell) => (!isMine[cell] && rng.chance(0.5) ? counts[cell]! : -1)),
        mines: Uint8Array.from({ length: total }, (_, cell) => (isMine[cell] && rng.chance(0.3) ? 1 : 0)),
        totalMines: mineCount,
      }
      const step = findStep(k)
      if (!step) continue
      const layouts = consistentLayouts(k)
      for (const cell of step.safe) expect(layouts.every((l) => l[cell] === 0)).toBe(true)
      for (const cell of step.mines) expect(layouts.every((l) => l[cell] === 1)).toBe(true)
      // The easiest technique that finds something is used.
      const easier = step.technique > 1 ? findStep(k, (step.technique - 1) as 1 | 2 | 3) : null
      expect(easier).toBeNull()
      used.add(step.technique)
      checked++
    }
    expect(checked).toBeGreaterThan(100)
    expect([...used].sort()).toEqual([1, 2, 3, 4])
  })

  it('solves a board from its start like a player', () => {
    // 4×4 with one mine in a corner: the start opens everything else.
    const mines = [15]
    const isMine = new Uint8Array(16)
    isMine[15] = 1
    const result = solveBoard(4, 4, isMine, adjacentCounts(4, 4, mines), 0, 1)
    expect(result.solved).toBe(true)
  })

  it('reports a 50/50 as not solvable', () => {
    const mines = [0]
    const isMine = new Uint8Array(4)
    isMine[0] = 1
    // 2×2 board, one mine, start opposite: the start shows 1 and every other cell is a candidate.
    const result = solveBoard(2, 2, isMine, adjacentCounts(2, 2, mines), 3, 1)
    expect(result.solved).toBe(false)
  })
})
