/**
 * Technique catalogue and difficulty grading.
 */
import {
  applyStep,
  createLogicState,
  findClaiming,
  findHiddenPair,
  findHiddenSingle,
  findHiddenTriple,
  findNakedPair,
  findNakedSingle,
  findNakedTriple,
  findPointing,
  findSwordfish,
  findXWing,
  findXYWing,
  isComplete,
  type LogicState,
} from './techniques'
import type { Step, TechniqueId } from './types'

interface TechniqueDef {
  id: TechniqueId
  level: 1 | 2 | 3 | 4
  weight: number
  find: (state: LogicState) => Step | null
}

/** Ordered from simplest to hardest – the solver always uses the simplest step available. */
const TECHNIQUES: readonly TechniqueDef[] = [
  { id: 'hiddenSingle', level: 1, weight: 1, find: findHiddenSingle },
  { id: 'nakedSingle', level: 1, weight: 1, find: findNakedSingle },
  { id: 'pointing', level: 2, weight: 3, find: findPointing },
  { id: 'claiming', level: 2, weight: 3, find: findClaiming },
  { id: 'nakedPair', level: 3, weight: 5, find: findNakedPair },
  { id: 'hiddenPair', level: 3, weight: 6, find: findHiddenPair },
  { id: 'nakedTriple', level: 3, weight: 7, find: findNakedTriple },
  { id: 'hiddenTriple', level: 3, weight: 8, find: findHiddenTriple },
  { id: 'xWing', level: 4, weight: 10, find: findXWing },
  { id: 'xyWing', level: 4, weight: 12, find: findXYWing },
  { id: 'swordfish', level: 4, weight: 14, find: findSwordfish },
]

export const TECHNIQUE_LEVEL = Object.fromEntries(
  TECHNIQUES.map((technique) => [technique.id, technique.level]),
) as Record<TechniqueId, number>

const TECHNIQUE_WEIGHT = Object.fromEntries(
  TECHNIQUES.map((technique) => [technique.id, technique.weight]),
) as Record<TechniqueId, number>

/** The simplest step available, using techniques up to `maxLevel`. */
export function findNextStep(state: LogicState, maxLevel = 4): Step | null {
  for (const technique of TECHNIQUES) {
    if (technique.level > maxLevel) break
    const step = technique.find(state)
    if (step) return step
  }
  return null
}

export interface Grade {
  /** Solved by logic alone with techniques up to the given level. */
  solved: boolean
  /** Hardest technique level used (0 if nothing was needed). */
  hardestLevel: number
  hardestTechnique: TechniqueId
  /** Sum of the weights of all steps. */
  score: number
  /** Number of logical steps taken. */
  steps: number
}

/** Solves the puzzle like a human would and reports how hard that was. */
export function gradePuzzle(givens: readonly number[], maxLevel = 4): Grade {
  const grade: Grade = {
    solved: false,
    hardestLevel: 0,
    hardestTechnique: 'nakedSingle',
    score: 0,
    steps: 0,
  }
  const state = createLogicState(givens)
  if (!state) return grade

  while (!isComplete(state)) {
    const step = findNextStep(state, maxLevel)
    if (!step) return grade
    applyStep(state, step)
    const level = TECHNIQUE_LEVEL[step.technique]
    if (level > grade.hardestLevel) {
      grade.hardestLevel = level
      grade.hardestTechnique = step.technique
    }
    grade.score += TECHNIQUE_WEIGHT[step.technique]
    grade.steps++
  }
  grade.solved = true
  return grade
}
