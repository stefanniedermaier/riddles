import { describe, expect, it } from 'vitest'

import { settings } from '@/core/settings'
import { describeHint, explainStep } from '../explain'
import { generatePuzzle } from '../logic/generator'
import { findNextStep } from '../logic/grader'
import { getHint } from '../logic/hints'
import { applyStep, createLogicState } from '../logic/techniques'
import { TECHNIQUE_IDS, type Step, type TechniqueId } from '../logic/types'

/** Collects at least one real step per technique by solving a few expert puzzles. */
function collectSteps(): Map<TechniqueId, Step> {
  const found = new Map<TechniqueId, Step>()
  for (let seed = 1; seed <= 40 && found.size < TECHNIQUE_IDS.length; seed++) {
    const puzzle = generatePuzzle('expert', seed)
    const state = createLogicState(puzzle.givens)!
    for (let step = findNextStep(state); step; step = findNextStep(state)) {
      if (!found.has(step.technique)) found.set(step.technique, step)
      applyStep(state, step)
    }
  }
  return found
}

describe('hint explanations', () => {
  const steps = collectSteps()

  for (const locale of ['en', 'de'] as const) {
    it(`renders every technique in ${locale}`, () => {
      settings.value.locale = locale
      for (const step of steps.values()) {
        const text = explainStep(step)
        expect(text).not.toMatch(/sudoku\.|\{\w+\}|undefined/)
        expect(text.length).toBeGreaterThan(10)
      }
    })
  }

  it('found the common techniques', () => {
    for (const id of ['hiddenSingle', 'nakedSingle', 'pointing', 'claiming', 'nakedPair'] as const) {
      expect(steps.has(id)).toBe(true)
    }
  })

  it('describes a hint with title, text and target cell', () => {
    settings.value.locale = 'en'
    const puzzle = generatePuzzle('medium', 3)
    const view = describeHint(getHint(puzzle.givens, puzzle.solution))
    expect(view.title).not.toMatch(/sudoku\./)
    expect(view.lines.length).toBeGreaterThan(0)
    expect(view.targetCell).not.toBeNull()
  })
})
