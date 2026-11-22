import { t } from './i18n'

/** Toast text after "Check": no mistakes, one mistake or several. */
export function checkMessage(count: number): string {
  if (count === 0) return t('common.checkOk')
  if (count === 1) return t('common.checkOne')
  return t('common.checkMany', { count })
}
