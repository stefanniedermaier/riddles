/**
 * After a route change: move focus to the new page's heading (screen readers then read it,
 * and Tab continues from the top of the new page instead of from a control that is gone)
 * and set the document title from it (home and game pages: their search title, plus the
 * description and canonical URL – `pageMeta.ts`). The first page load keeps the browser's focus;
 * query-only changes (`?new=`) are the same page and keep focus where it is.
 */
import { nextTick } from 'vue'
import type { Router } from 'vue-router'

import { games } from '@/games/registry'
import { t } from './i18n'
import { applyMeta, metaFor } from './pageMeta'

/** Text of the page heading, whitespace collapsed (nested spans such as a level label). */
function headingText(heading: HTMLElement): string {
  return (heading.textContent ?? '').replace(/\s+/g, ' ').trim()
}

/** Title for a page whose heading reads `heading` (the app name alone on Home). */
export function pageTitle(heading: string): string {
  const app = t('app.name')
  return heading === '' || heading === app ? app : `${heading} – ${app}`
}

const gameIds = games.map((game) => game.id)

export function installRouteFocus(router: Router): void {
  router.afterEach(async (to, from, failure) => {
    if (failure) return
    const firstLoad = from.matched.length === 0
    if (!firstLoad && to.path === from.path) return
    await nextTick()
    const heading = document.querySelector<HTMLElement>('h1')
    if (!heading) return
    const meta = metaFor(to, gameIds)
    document.title = meta?.title ?? pageTitle(headingText(heading))
    applyMeta(meta)
    if (firstLoad) return
    heading.setAttribute('tabindex', '-1')
    heading.dataset.routeFocus = ''
    heading.focus({ preventScroll: true })
  })
}
