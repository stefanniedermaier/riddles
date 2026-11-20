import { describe, expect, it } from 'vitest'

import {
  FEATURE_START,
  createLevelField,
  getLevel,
  goalStatus,
  goalsMet,
  type LevelGoal,
} from '../levels'
import { CELLS, SIZE, emptyField } from '../types'

type CollectGoal = Extract<LevelGoal, { type: 'collect' }>
type SpecialsGoal = Extract<LevelGoal, { type: 'specials' }>

const none = () => ({ collected: [0, 0, 0, 0, 0, 0], specials: 0, items: 0 })
const count = (values: number[]) => values.filter((v) => v > 0).length

describe('levels', () => {
  it('is deterministic and never ends', () => {
    expect(getLevel(12)).toEqual(getLevel(12))
    expect(getLevel(12)).not.toEqual(getLevel(13))
    expect(getLevel(5000).level).toBe(5000)
  })

  it('has sane parameters and layouts for many levels', () => {
    const problems: string[] = []
    const check = (ok: boolean, message: string) => {
      if (!ok) problems.push(message)
    }
    for (let n = 1; n <= 300; n++) {
      const def = getLevel(n)
      const { layout } = def
      check(def.level === n, `L${n}: level number`)
      check(def.kinds === (n <= 5 ? 5 : 6), `L${n}: kinds`)
      check(def.moves >= 12 && def.moves <= 40, `L${n}: moves ${def.moves}`)
      check(def.goals.length >= 1 && def.goals.length <= 3, `L${n}: goal count`)
      check(def.moveBonus > 0, `L${n}: move bonus`)

      if (def.features.length === 0) {
        check(def.goals[0]!.type === 'score', `L${n}: classic levels start with a score goal`)
        const collects = def.goals.filter((g): g is CollectGoal => g.type === 'collect')
        for (const goal of collects) {
          check(goal.kind < def.kinds && goal.count > 0, `L${n}: collect goal`)
          check(goal.count <= def.moves * 3, `L${n}: collect goal reachable`)
        }
        check(new Set(collects.map((g) => g.kind)).size === collects.length, `L${n}: distinct kinds`)
        const specials = def.goals.filter((g): g is SpecialsGoal => g.type === 'specials')
        for (const goal of specials) check(goal.count <= 3, `L${n}: specials goal`)
      }

      for (let cell = 0; cell < CELLS; cell++) {
        const row = Math.floor(cell / SIZE)
        const mirror = row * SIZE + (SIZE - 1 - (cell % SIZE))
        const used = [layout.crates[cell]!, layout.chains[cell]!, layout.targets[cell]!].filter((v) => v > 0)
        check(used.length <= 1, `L${n}: overlapping obstacles on ${cell}`)
        check(
          layout.crates[mirror] === layout.crates[cell] &&
            layout.chains[mirror] === layout.chains[cell] &&
            layout.targets[mirror] === layout.targets[cell],
          `L${n}: layout not symmetric at ${cell}`,
        )
        // Fixed obstacles never block the bottom row (drop items must reach it).
        check(
          row < SIZE - 1 || (layout.crates[cell] === 0 && layout.chains[cell] === 0),
          `L${n}: obstacle in the bottom row`,
        )
        check(layout.crates[cell]! <= 2, `L${n}: crate hit points`)
      }

      // Goals match the layout.
      const expected: Record<string, number> = {
        targets: count(layout.targets),
        crates: count(layout.crates),
        chains: count(layout.chains),
        items: layout.items,
      }
      for (const goal of def.goals) {
        if (goal.type in expected && 'count' in goal) {
          check(goal.count === expected[goal.type], `L${n}: ${goal.type} goal count`)
        }
      }
      check(def.features.includes('items') === layout.items > 0, `L${n}: items feature`)
      for (const cell of layout.itemStart) {
        check(Math.floor(cell / SIZE) === 2, `L${n}: item start row`)
        check(layout.crates[cell]! + layout.chains[cell]! === 0, `L${n}: item start blocked`)
      }
    }
    expect(problems).toEqual([])
  })

  it('introduces each obstacle type on its own level', () => {
    for (const [feature, level] of Object.entries(FEATURE_START)) {
      expect(getLevel(level).features).toEqual([feature])
    }
    expect(getLevel(1).features).toEqual([])
    expect(getLevel(2).features).toEqual([])
    // No obstacle type appears before its introduction.
    for (let n = 1; n < 40; n++) {
      for (const feature of getLevel(n).features) {
        expect(n).toBeGreaterThanOrEqual(FEATURE_START[feature])
      }
    }
  })

  it('evaluates classic goals', () => {
    const def = getLevel(2)
    expect(def.features).toEqual([])
    const target = (def.goals[0] as Extract<LevelGoal, { type: 'score' }>).target
    const all = { collected: [99, 99, 99, 99, 99, 99], specials: 9, items: 0 }
    expect(goalsMet(def, target, all)).toBe(true)
    expect(goalsMet(def, target - 1, all)).toBe(false)
    expect(goalStatus(def, 0, none()).every((s) => !s.done && s.current === 0)).toBe(true)
  })

  it('evaluates obstacle goals from the field', () => {
    const def = getLevel(FEATURE_START.targets)
    const field = createLevelField(def)
    const [status] = goalStatus(def, 0, none(), field)
    expect(status!.goal.type).toBe('targets')
    expect(status!.current).toBe(0)
    const cleared = { ...field, targets: field.targets.map(() => 0) }
    expect(goalsMet(def, 0, none(), cleared)).toBe(true)
    expect(goalsMet(def, 0, none(), { ...emptyField(), targets: field.targets })).toBe(false)

    const items = getLevel(FEATURE_START.items)
    const itemField = createLevelField(items)
    expect(itemField.itemsPending).toBe(items.layout.items - items.layout.itemStart.length)
    expect(goalsMet(items, 0, { ...none(), items: items.layout.items }, itemField)).toBe(true)
  })
})
