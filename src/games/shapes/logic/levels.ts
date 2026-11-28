import { createRng, hashSeed, type Rng } from '@/core/rng'

import { CELLS, SIZE, cellAt, emptyField, fieldCounts, type Field } from './types'

export type LevelGoal =
  | { type: 'score'; target: number }
  | { type: 'collect'; kind: number; count: number }
  | { type: 'specials'; count: number }
  | { type: 'targets'; count: number }
  | { type: 'crates'; count: number }
  | { type: 'chains'; count: number }
  | { type: 'items'; count: number }

export type Feature = 'targets' | 'chains' | 'crates' | 'items'

/** Obstacles of a level at its start. */
interface LevelLayout {
  /** Crate hit points per cell (0 = none). */
  crates: number[]
  /** 1 = target tile. */
  targets: number[]
  /** 1 = chained piece. */
  chains: number[]
  /** Total number of drop items to bring down. */
  items: number
  /** Cells that hold a drop item at the start. */
  itemStart: number[]
  /** Maximum number of drop items on the board at the same time. */
  maxItems: number
}

export interface LevelDef {
  level: number
  /** Seed for the starting board – a level always starts with the same board. */
  seed: number
  /** Number of piece kinds in play. */
  kinds: number
  /** Move limit. */
  moves: number
  /** Bonus points per unused move when the level is completed. */
  moveBonus: number
  goals: LevelGoal[]
  features: Feature[]
  layout: LevelLayout
}

/** Progress towards goals that are not visible on the field itself. */
export interface LevelProgress {
  /** Cleared pieces per kind. */
  collected: number[]
  specials: number
  /** Drop items brought to the bottom. */
  items: number
}

/** First level of each obstacle type (that level introduces it on its own). */
export const FEATURE_START: Record<Feature, number> = { targets: 3, chains: 5, crates: 7, items: 9 }
const FEATURES: Feature[] = ['targets', 'chains', 'crates', 'items']

/**
 * Average points and cleared pieces per kind that a casual player makes per move.
 * Measured with a bot that plays half of its moves greedily and half randomly
 * (see docs/games/shapes.md). Fewer kinds mean more cascades and therefore more points.
 */
const POINTS_PER_MOVE = { 5: 220, 6: 145 } as const
const CLEARED_PER_KIND_PER_MOVE = { 5: 1.8, 6: 1.2 } as const

/**
 * Moves a casual player needs per obstacle unit (tuned with the same bot, see
 * `__tests__/levels.tuning.test.ts`).
 */
const MOVES_PER = { target: 1.9, chain: 3.1, crateHit: 0.9, item: 5.5 } as const
/** Fixed extra moves per obstacle type in a level (getting started, unlucky boards). */
const MOVES_BASE: Record<Feature, number> = { targets: 3, chains: 5, crates: 6, items: 3 }
/** Obstacles in the edge columns see fewer matches and therefore cost more. */
const EDGE_WEIGHT = 1.4

const roundTo = (value: number, step: number) => Math.max(step, Math.round(value / step) * step)
const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value))

function emptyLayout(): LevelLayout {
  const zeros = () => new Array<number>(CELLS).fill(0)
  return { crates: zeros(), targets: zeros(), chains: zeros(), items: 0, itemStart: [], maxItems: 0 }
}

/**
 * Places `pairs` mirrored obstacles (cell and its horizontal mirror) in rows
 * `minRow`…`maxRow` on free cells. Returns the cells used.
 */
function placeMirrored(
  rng: Rng,
  occupied: Set<number>,
  count: number,
  minRow: number,
  maxRow: number,
  perColumn: number[],
  maxPerColumn: number,
): number[] {
  const candidates: [number, number][] = []
  for (let row = minRow; row <= maxRow; row++) {
    for (let col = 0; col < SIZE / 2; col++) candidates.push([row, col])
  }
  rng.shuffle(candidates)
  const used: number[] = []
  for (const [row, col] of candidates) {
    if (used.length >= count) break
    const a = cellAt(row, col)
    const b = cellAt(row, SIZE - 1 - col)
    if (occupied.has(a) || occupied.has(b)) continue
    if (perColumn[col]! >= maxPerColumn || perColumn[SIZE - 1 - col]! >= maxPerColumn) continue
    used.push(a, b)
    occupied.add(a)
    occupied.add(b)
    perColumn[col]!++
    perColumn[SIZE - 1 - col]!++
  }
  return used
}

/** Deterministic definition of level `n` (1-based). Levels never end. */
export function getLevel(n: number): LevelDef {
  const level = Math.max(1, Math.floor(n))
  const seed = hashSeed('shapes-level', level)
  const rng = createRng(seed)
  const kinds = level <= 5 ? 5 : 6
  // Difficulty ramps from ~50 % to 90 % of what a casual player achieves, with a slight wobble.
  const ramp = Math.min(0.9, 0.5 + level * 0.012) + (rng.next() - 0.5) * 0.06

  // --- Which obstacles? ----------------------------------------------------------------
  const intro = FEATURES.find((feature) => FEATURE_START[feature] === level)
  let features: Feature[] = []
  if (intro) features = [intro]
  else if (level >= FEATURE_START.targets && !rng.chance(0.2)) {
    const unlocked = FEATURES.filter((feature) => FEATURE_START[feature] <= level)
    const count = level >= 12 && rng.chance(0.4) ? 2 : 1
    features = rng.shuffle(unlocked.slice()).slice(0, Math.min(count, unlocked.length))
    features.sort((x, y) => FEATURES.indexOf(x) - FEATURES.indexOf(y))
  }

  // --- Layout ----------------------------------------------------------------------------
  const layout = emptyLayout()
  const occupied = new Set<number>()
  const perColumn = new Array<number>(SIZE).fill(0)
  const growth = (feature: Feature) => clamp((level - FEATURE_START[feature]) / 30, 0, 1)
  // Levels combining two obstacle types get fewer of each.
  const share = features.length > 1 ? 0.55 : 1
  const pairs = (min: number, extra: number, feature: Feature) =>
    Math.max(2, Math.round(((min + extra * growth(feature)) * share) / 2) * 2)

  // Fixed obstacles never sit in the bottom row, so drop items can always be collected.
  if (features.includes('crates')) {
    const cells = placeMirrored(rng, occupied, pairs(4, 10, 'crates'), 2, SIZE - 2, perColumn, 2)
    const strong = level >= 12 ? 0.4 : 0
    for (let i = 0; i < cells.length; i += 2) {
      const hp = rng.chance(strong) ? 2 : 1
      layout.crates[cells[i]!] = hp
      layout.crates[cells[i + 1]!] = hp
    }
  }
  if (features.includes('chains')) {
    for (const cell of placeMirrored(rng, occupied, pairs(4, 6, 'chains'), 1, SIZE - 2, perColumn, 3)) {
      layout.chains[cell] = 1
    }
  }
  if (features.includes('targets')) {
    for (const cell of placeMirrored(rng, occupied, pairs(8, 8, 'targets'), 2, SIZE - 1, perColumn, 8)) {
      layout.targets[cell] = 1
    }
  }
  if (features.includes('items')) {
    layout.items = 2 + Math.round(2 * growth('items'))
    layout.maxItems = layout.items
    // Up to two items start on the board in different middle columns (edge columns see few
    // matches, so items there would hardly move), already a bit down the board; the rest drop
    // in from the top later.
    const free = rng.shuffle(
      [2, 3, 4, 5].map((col) => cellAt(2, col)).filter((cell) => !occupied.has(cell)),
    )
    layout.itemStart = free.slice(0, Math.min(2, layout.items))
  }

  // --- Goals and moves -------------------------------------------------------------------
  const goals: LevelGoal[] = []
  let moves: number
  const classicMoves = Math.max(18, 30 - Math.floor((level - 1) / 3))
  const perMoveScore = POINTS_PER_MOVE[kinds] * ramp

  if (features.length === 0) {
    moves = classicMoves
    goals.push({ type: 'score', target: roundTo(moves * perMoveScore, 100) })
    const perKind = moves * CLEARED_PER_KIND_PER_MOVE[kinds] * ramp
    const kindOrder = rng.shuffle(Array.from({ length: kinds }, (_, i) => i))
    if (level >= 2) {
      goals.push({ type: 'collect', kind: kindOrder[0]!, count: Math.round(perKind * 0.85) })
    }
    if (level >= 4 && level % 3 === 1) {
      goals.push({ type: 'specials', count: Math.min(3, 1 + Math.floor(level / 15)) })
    } else if (level >= 8 && rng.chance(0.5)) {
      goals.push({ type: 'collect', kind: kindOrder[1]!, count: Math.round(perKind * 0.7) })
    }
  } else {
    const counts = fieldCounts({ ...emptyField(), ...layout })
    /** Weighted obstacle units: hit points, edge columns count more. */
    const units = (values: number[]) =>
      values.reduce((sum, value, cell) => {
        const col = cell % SIZE
        return sum + value * (col === 0 || col === SIZE - 1 ? EDGE_WEIGHT : 1)
      }, 0)
    let need = 0
    if (counts.targets > 0) {
      goals.push({ type: 'targets', count: counts.targets })
      need += MOVES_BASE.targets + units(layout.targets) * MOVES_PER.target
    }
    if (counts.crates > 0) {
      goals.push({ type: 'crates', count: counts.crates })
      need += MOVES_BASE.crates + units(layout.crates) * MOVES_PER.crateHit
    }
    if (counts.chains > 0) {
      goals.push({ type: 'chains', count: counts.chains })
      need += MOVES_BASE.chains + units(layout.chains) * MOVES_PER.chain
    }
    if (layout.items > 0) {
      goals.push({ type: 'items', count: layout.items })
      need += MOVES_BASE.items + layout.items * MOVES_PER.item
    }
    // Two obstacle types overlap a little (one move often helps both).
    if (features.length > 1) need *= 0.9
    // Generous at first, tighter later (from 1.5× to 1.2× of a casual player's need).
    // Levels introducing an obstacle type are extra friendly.
    const slack = (1.5 - 0.3 * clamp((level - 3) / 40, 0, 1)) * (intro ? 1.3 : 1)
    moves = clamp(Math.round(need * slack), 12, 40)
  }

  return {
    level,
    seed,
    kinds,
    moves,
    moveBonus: roundTo(perMoveScore * 1.2, 10),
    goals,
    features,
    layout,
  }
}

/** The obstacle field a level starts with. */
export function createLevelField(def: LevelDef): Field {
  return {
    crates: def.layout.crates.slice(),
    targets: def.layout.targets.slice(),
    chains: def.layout.chains.slice(),
    itemsPending: Math.max(0, def.layout.items - def.layout.itemStart.length),
    maxItems: def.layout.maxItems,
  }
}

export interface GoalStatus {
  goal: LevelGoal
  current: number
  target: number
  done: boolean
}

export function goalStatus(
  def: LevelDef,
  score: number,
  progress: LevelProgress,
  field?: Field,
): GoalStatus[] {
  const remaining = field ? fieldCounts(field) : { crates: 0, targets: 0, chains: 0 }
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
      case 'targets':
        current = goal.count - remaining.targets
        target = goal.count
        break
      case 'crates':
        current = goal.count - remaining.crates
        target = goal.count
        break
      case 'chains':
        current = goal.count - remaining.chains
        target = goal.count
        break
      case 'items':
        current = progress.items
        target = goal.count
        break
    }
    return { goal, current: Math.min(current, target), target, done: current >= target }
  })
}

export function goalsMet(def: LevelDef, score: number, progress: LevelProgress, field?: Field): boolean {
  return goalStatus(def, score, progress, field).every((status) => status.done)
}
