import { createRng, hashSeed } from '@/core/rng'

export type LevelGoal =
  | { type: 'score'; target: number }
  | { type: 'collect'; kind: number; count: number }
  | { type: 'specials'; count: number }

export interface LevelDef {
  level: number
  /** Seed for the starting board – a level always starts with the same board. */
  seed: number
  /** Number of piece kinds in play. */
  kinds: number
  /** Move limit. */
  moves: number
  /** Score goal; also the reference for 2 / 3 stars. */
  targetScore: number
  /** Bonus points per unused move when the level is completed. */
  moveBonus: number
  goals: LevelGoal[]
}

/** Progress towards non-score goals during a level. */
export interface LevelProgress {
  /** Cleared pieces per kind. */
  collected: number[]
  specials: number
}

/**
 * Average points and cleared pieces per kind that a casual player makes per move.
 * Measured with a bot that plays half of its moves greedily and half randomly
 * (see docs/games/shapes.md). Fewer kinds mean more cascades and therefore more points.
 */
const POINTS_PER_MOVE = { 5: 220, 6: 145 } as const
const CLEARED_PER_KIND_PER_MOVE = { 5: 1.8, 6: 1.2 } as const

const roundTo = (value: number, step: number) => Math.max(step, Math.round(value / step) * step)

/** Deterministic definition of level `n` (1-based). */
export function getLevel(n: number): LevelDef {
  const level = Math.max(1, Math.floor(n))
  const seed = hashSeed('shapes-level', level)
  const rng = createRng(seed)

  const kinds = level <= 5 ? 5 : 6
  const moves = Math.max(18, 30 - Math.floor((level - 1) / 3))
  // Difficulty ramps from ~50 % to 90 % of what a casual player achieves, with a slight wobble.
  const ramp = Math.min(0.9, 0.5 + level * 0.012) + (rng.next() - 0.5) * 0.06
  const targetScore = roundTo(moves * POINTS_PER_MOVE[kinds] * ramp, 100)
  const perKind = moves * CLEARED_PER_KIND_PER_MOVE[kinds] * ramp

  const goals: LevelGoal[] = [{ type: 'score', target: targetScore }]

  const kindOrder = rng.shuffle(Array.from({ length: kinds }, (_, i) => i))
  if (level >= 2) {
    goals.push({ type: 'collect', kind: kindOrder[0]!, count: Math.round(perKind * 0.85) })
  }
  if (level >= 4 && level % 3 === 1) {
    goals.push({ type: 'specials', count: Math.min(3, 1 + Math.floor(level / 15)) })
  } else if (level >= 8 && rng.chance(0.5)) {
    goals.push({ type: 'collect', kind: kindOrder[1]!, count: Math.round(perKind * 0.7) })
  }

  return {
    level,
    seed,
    kinds,
    moves,
    targetScore,
    moveBonus: roundTo((targetScore / moves) * 1.2, 10),
    goals,
  }
}

export interface GoalStatus {
  goal: LevelGoal
  current: number
  target: number
  done: boolean
}

export function goalStatus(def: LevelDef, score: number, progress: LevelProgress): GoalStatus[] {
  return def.goals.map((goal) => {
    let current: number
    let target: number
    switch (goal.type) {
      case 'score':
        current = score
        target = goal.target
        break
      case 'collect':
        current = progress.collected[goal.kind] ?? 0
        target = goal.count
        break
      case 'specials':
        current = progress.specials
        target = goal.count
        break
    }
    return { goal, current: Math.min(current, target), target, done: current >= target }
  })
}

export function goalsMet(def: LevelDef, score: number, progress: LevelProgress): boolean {
  return goalStatus(def, score, progress).every((status) => status.done)
}

/** Stars for a completed level: 1 = goals met, 2 / 3 = final score ≥ 1.5× / 2× target. */
export function starsFor(def: LevelDef, finalScore: number): 1 | 2 | 3 {
  if (finalScore >= def.targetScore * 2) return 3
  if (finalScore >= def.targetScore * 1.5) return 2
  return 1
}
