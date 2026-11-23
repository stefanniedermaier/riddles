import AxeBuilder from '@axe-core/playwright'
import { test as base, expect, type Page } from '@playwright/test'

/**
 * Fails a test on any console error, uncaught exception (including Content-Security-Policy
 * violations) or request that leaves the app's own origin.
 */
export const test = base.extend<{ problems: string[] }>({
  problems: [
    async ({ page, baseURL }, use) => {
      const problems: string[] = []
      const origin = new URL(baseURL!).origin
      page.on('console', (message) => {
        if (message.type() === 'error') problems.push(`console: ${message.text()}`)
      })
      page.on('pageerror', (error) => problems.push(`page error: ${error.message}`))
      page.on('request', (request) => {
        const url = new URL(request.url())
        if (!['data:', 'blob:'].includes(url.protocol) && url.origin !== origin) {
          problems.push(`third-party request: ${request.url()}`)
        }
      })
      await use(problems)
      expect(problems, 'console errors, CSP violations or third-party requests').toEqual([])
    },
    { auto: true },
  ],
})

export { expect }

/** WCAG 2.2 level A and AA rules. */
export async function expectAccessible(page: Page): Promise<void> {
  const results = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
    .analyze()
  const summary = results.violations.map(
    (v) => `${v.id} (${v.impact}): ${v.help} – ${v.nodes.map((n) => n.target.join(' ')).join(', ')}`,
  )
  expect(summary, 'accessibility violations').toEqual([])
}
