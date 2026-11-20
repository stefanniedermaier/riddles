/**
 * Turns logical steps into translated, human readable sentences.
 */
import { t } from '@/core/i18n'

import { colOf, rowOf } from './logic/board'
import type { Hint } from './logic/hints'
import type { Step, Unit } from './logic/types'

export function cellName(cell: number): string {
  return t('sudoku.units.cell', { row: rowOf(cell) + 1, col: colOf(cell) + 1 })
}

export function unitName(unit: Unit): string {
  return t(`sudoku.units.${unit.kind}`, { n: unit.index + 1 })
}

function list(items: string[]): string {
  if (items.length <= 1) return items.join('')
  return `${items.slice(0, -1).join(', ')}${t('sudoku.units.and')}${items[items.length - 1]}`
}

const cells = (list_: number[]): string => list(list_.map(cellName))
const units = (list_: Unit[]): string => list(list_.map(unitName))
const digits = (list_: number[]): string => list(list_.map(String))

export function explainStep(step: Step): string {
  const digit = step.digits[0] ?? 0
  switch (step.technique) {
    case 'nakedSingle':
      return t('sudoku.hint.explain.nakedSingle', {
        cell: cellName(step.placements[0]!.cell),
        digit,
      })
    case 'hiddenSingle':
      return t('sudoku.hint.explain.hiddenSingle', {
        unit: unitName(step.units[0]!),
        digit,
        cell: cellName(step.placements[0]!.cell),
      })
    case 'pointing':
      return t('sudoku.hint.explain.pointing', {
        box: unitName(step.units[0]!),
        line: unitName(step.coverUnits[0]!),
        digit,
      })
    case 'claiming':
      return t('sudoku.hint.explain.claiming', {
        line: unitName(step.units[0]!),
        box: unitName(step.coverUnits[0]!),
        digit,
      })
    case 'nakedPair':
    case 'nakedTriple':
      return t('sudoku.hint.explain.nakedSubset', {
        cells: cells(step.focusCells),
        unit: unitName(step.units[0]!),
        digits: digits(step.digits),
      })
    case 'hiddenPair':
    case 'hiddenTriple':
      return t('sudoku.hint.explain.hiddenSubset', {
        unit: unitName(step.units[0]!),
        digits: digits(step.digits),
        cells: cells(step.focusCells),
      })
    case 'xWing':
    case 'swordfish':
      return t('sudoku.hint.explain.fish', {
        base: units(step.units),
        cover: units(step.coverUnits),
        digit,
      })
    case 'xyWing': {
      const [pivot, pincer1, pincer2] = step.focusCells as [number, number, number]
      const [a, b, c] = step.digits as [number, number, number]
      return t('sudoku.hint.explain.xyWing', {
        pivot: cellName(pivot),
        pincer1: cellName(pincer1),
        pincer2: cellName(pincer2),
        a,
        b,
        c,
      })
    }
  }
}

export interface HintView {
  title: string
  lines: { label?: string; text: string }[]
  /** Cells to emphasise as the reason for the step. */
  focusCells: number[]
  /** The cell that gets filled in (if any). */
  targetCell: number | null
  /** Cells flagged as wrong (mistake hints). */
  wrongCells: number[]
}

export function describeHint(hint: Hint): HintView {
  switch (hint.kind) {
    case 'mistake':
      return {
        title: t('sudoku.hint.mistakeTitle'),
        lines: [
          {
            text:
              hint.cells.length === 1
                ? t('sudoku.hint.mistakeOne')
                : t('sudoku.hint.mistakeMany', { count: hint.cells.length }),
          },
        ],
        focusCells: [],
        targetCell: null,
        wrongCells: hint.cells,
      }
    case 'reveal':
      return {
        title: t('sudoku.hint.revealTitle'),
        lines: [
          {
            text: t('sudoku.hint.reveal', {
              cell: cellName(hint.placement.cell),
              digit: hint.placement.digit,
            }),
          },
        ],
        focusCells: [],
        targetCell: hint.placement.cell,
        wrongCells: [],
      }
    case 'solved':
      return { title: t('sudoku.hint.title'), lines: [], focusCells: [], targetCell: null, wrongCells: [] }
    case 'step': {
      const final = hint.steps[hint.steps.length - 1]!
      const lines: HintView['lines'] = []
      const focus = new Set<number>(final.focusCells)
      if (hint.key) {
        lines.push({ label: t('sudoku.hint.first'), text: explainStep(hint.key) })
        for (const cell of hint.key.focusCells) focus.add(cell)
        lines.push({ label: t('sudoku.hint.then'), text: explainStep(final) })
        const extra = hint.steps.length - 2
        if (extra > 0) lines.push({ text: t('sudoku.hint.moreSteps', { count: extra }) })
      } else {
        lines.push({ text: explainStep(final) })
      }
      focus.delete(hint.placement.cell)
      const technique = hint.key?.technique ?? final.technique
      return {
        title: t(`sudoku.techniques.${technique}`),
        lines,
        focusCells: [...focus],
        targetCell: hint.placement.cell,
        wrongCells: [],
      }
    }
  }
}
