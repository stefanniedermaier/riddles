import { afterEach, describe, expect, it } from 'vitest'

import { settings } from '@/core/settings'
import { hintText, hintTitle } from '../hintText'
import { generatePuzzle } from '../logic/generator'
import { applyHint, getHint, type Hint } from '../logic/hints'
import type { CellState } from '../logic/types'

function collectHints(): Hint[] {
  const hints: Hint[] = []
  for (const [difficulty, seed] of [
    ['hard', 4],
    ['expert', 3],
  ] as const) {
    const puzzle = generatePuzzle(difficulty, seed)
    let cells = new Array<CellState>(puzzle.size * puzzle.size).fill(0)
    for (let hint = getHint(puzzle, cells); hint.kind === 'step'; hint = getHint(puzzle, cells)) {
      hints.push(hint)
      cells = applyHint(cells, hint)
    }
    hints.push({ kind: 'wrongCrown', cell: 0 }, { kind: 'wrongMark', cell: 0 }, { kind: 'solved' })
  }
  return hints
}

describe('hint texts', () => {
  afterEach(() => {
    settings.value.locale = 'system'
  })

  for (const locale of ['en', 'de'] as const) {
    it(`renders every hint without placeholders (${locale})`, () => {
      settings.value.locale = locale
      const hints = collectHints()
      const techniques = new Set(hints.flatMap((h) => (h.kind === 'step' ? [h.step.technique] : [])))
      expect(techniques).toContain('groupConfinement')
      for (const hint of hints) {
        const text = hintText(hint)
        expect(text).not.toMatch(/[{}]/)
        expect(text.charAt(0)).toBe(text.charAt(0).toUpperCase())
        expect(hintTitle(hint)).not.toContain('crowns.')
      }
    })
  }
})
