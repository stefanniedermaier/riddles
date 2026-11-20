import { describe, expect, it } from 'vitest'

import { getLevel, goalStatus, goalsMet, starsFor, type LevelGoal } from '../levels'

type CollectGoal = Extract<LevelGoal, { type: 'collect' }>
type SpecialsGoal = Extract<LevelGoal, { type: 'specials' }>

describe('levels', () => {
  it('is deterministic', () => {
    expect(getLevel(12)).toEqual(getLevel(12))
    expect(getLevel(12)).not.toEqual(getLevel(13))
  })

  it('has sane parameters for many levels', () => {
    for (let n = 1; n <= 200; n++) {
      const def = getLevel(n)
      expect(def.level).toBe(n)
      expect(def.kinds).toBe(n <= 5 ? 5 : 6)
      expect(def.moves).toBeGreaterThanOrEqual(18)
      expect(def.moves).toBeLessThanOrEqual(30)
      expect(def.goals.length).toBeGreaterThanOrEqual(1)
      expect(def.goals.length).toBeLessThanOrEqual(3)
      expect(def.goals[0]).toEqual({ type: 'score', target: def.targetScore })
      expect(def.moveBonus).toBeGreaterThan(0)
      const collects = def.goals.filter((g): g is CollectGoal => g.type === 'collect')
      for (const goal of collects) {
        expect(goal.kind).toBeLessThan(def.kinds)
        expect(goal.count).toBeGreaterThan(0)
        // Reachable in principle: a move clears at least three pieces.
        expect(goal.count).toBeLessThanOrEqual(def.moves * 3)
      }
      expect(new Set(collects.map((g) => g.kind)).size).toBe(collects.length)
      const specials = def.goals.filter((g): g is SpecialsGoal => g.type === 'specials')
      for (const goal of specials) expect(goal.count).toBeLessThanOrEqual(3)
    }
  })

  it('gets harder over time', () => {
    expect(getLevel(1).moves).toBeGreaterThan(getLevel(40).moves)
    expect(getLevel(1).goals).toHaveLength(1)
    expect(getLevel(10).goals.length).toBeGreaterThan(1)
  })

  it('evaluates goals and stars', () => {
    const def = getLevel(4)
    const progress = { collected: [99, 99, 99, 99, 99, 99], specials: 9 }
    expect(goalsMet(def, def.targetScore, progress)).toBe(true)
    expect(goalsMet(def, def.targetScore - 1, progress)).toBe(false)
    const none = { collected: [0, 0, 0, 0, 0, 0], specials: 0 }
    expect(goalStatus(def, 0, none).every((s) => !s.done && s.current === 0)).toBe(true)

    expect(starsFor(def, def.targetScore)).toBe(1)
    expect(starsFor(def, def.targetScore * 1.5)).toBe(2)
    expect(starsFor(def, def.targetScore * 2)).toBe(3)
  })
})
