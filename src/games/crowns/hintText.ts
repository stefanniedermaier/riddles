/** Turns a logic hint into translated title + explanation. */
import { locale, t } from '@/core/i18n'

import type { Unit } from './logic/geometry'
import type { Hint } from './logic/hints'

function unitName(unit: Unit): string {
  if (unit.kind === 'row') return t('crowns.unit.row', { n: unit.index + 1 })
  if (unit.kind === 'col') return t('crowns.unit.col', { n: unit.index + 1 })
  return t('crowns.unit.region')
}

function linesName(lines: Unit[]): string {
  const numbers = lines.map((line) => String(line.index + 1))
  const list =
    numbers.length <= 1
      ? numbers.join('')
      : `${numbers.slice(0, -1).join(', ')} ${t('crowns.unit.and')} ${numbers[numbers.length - 1]}`
  return t(lines[0]?.kind === 'col' ? 'crowns.unit.cols' : 'crowns.unit.rows', { list })
}

function capitalize(text: string): string {
  return text.charAt(0).toLocaleUpperCase(locale.value) + text.slice(1)
}

export function hintTitle(hint: Hint): string {
  switch (hint.kind) {
    case 'wrongCrown':
    case 'wrongMark':
      return t('crowns.technique.mistake')
    case 'step':
      return t(`crowns.technique.${hint.step.technique}`)
    default:
      return t('crowns.hint.title')
  }
}

export function hintText(hint: Hint): string {
  switch (hint.kind) {
    case 'wrongCrown':
      return t('crowns.hint.wrongCrown')
    case 'wrongMark':
      return t('crowns.hint.wrongMark')
    case 'solved':
      return t('crowns.hint.solved')
    case 'stuck':
      return t('crowns.hint.stuck')
    case 'step':
      break
  }

  const { step } = hint
  const unit = step.units[0]!
  switch (step.technique) {
    case 'lastCell':
      return capitalize(t('crowns.hint.lastCell', { unit: unitName(unit) }))
    case 'confinement':
      // region → line, or line → region
      return unit.kind === 'region'
        ? capitalize(t('crowns.hint.confinementRegion', { line: unitName(step.lines[0]!) }))
        : capitalize(t('crowns.hint.confinementLine', { line: unitName(unit) }))
    case 'forced':
      return capitalize(t('crowns.hint.forced', { unit: unitName(unit) }))
    case 'groupConfinement':
      return unit.kind === 'region'
        ? capitalize(
            t('crowns.hint.groupRegions', { count: step.units.length, lines: linesName(step.lines) }),
          )
        : capitalize(
            t('crowns.hint.groupLines', { count: step.lines.length, lines: linesName(step.units) }),
          )
  }
}
