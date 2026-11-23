import AxeBuilder from '@axe-core/playwright'
import { expect, test, type Page } from '@playwright/test'

/** Every top-level screen of the app (hash routes). */
const screens = [
  { name: 'home', hash: '' },
  { name: 'settings', hash: '#/settings' },
  { name: 'stats', hash: '#/stats' },
  { name: 'privacy', hash: '#/privacy' },
  { name: 'not found', hash: '#/does-not-exist' },
  ...['sudoku', 'crowns', 'shapes', 'links', 'nonogram', 'merge', 'arrows', 'blocks'].map(
    (game) => ({ name: `${game} lobby`, hash: `#/${game}` }),
  ),
]

/**
 * Collects console errors and uncaught exceptions – this also catches Content-Security-Policy
 * violations, which the browser reports as console errors.
 */
function collectErrors(page: Page): string[] {
  const errors: string[] = []
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text())
  })
  page.on('pageerror', (error) => errors.push(error.message))
  return errors
}

test.describe('production build', () => {
  test('ships a Content-Security-Policy and loads without errors', async ({ page }) => {
    const errors = collectErrors(page)
    await page.goto('./')
    await expect(page.locator('meta[http-equiv="Content-Security-Policy"]')).toHaveAttribute(
      'content',
      /default-src 'self'.*object-src 'none'/,
    )
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
    await expect(page.locator('.game-card').first()).toBeVisible()
    expect(errors).toEqual([])
  })

  test('works offline once the service worker is active', async ({ page, context }) => {
    await page.goto('./')
    await page.evaluate(async () => {
      await navigator.serviceWorker.register('./sw.js', { scope: './' })
      await navigator.serviceWorker.ready
    })
    await context.setOffline(true)
    await page.reload()
    await expect(page.locator('.game-card').first()).toBeVisible()
    await page.goto('./#/settings')
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
  })
})

for (const screen of screens) {
  test(`${screen.name}: renders without errors and has no accessibility violations`, async ({
    page,
  }) => {
    const errors = collectErrors(page)
    // The app turns transitions off for reduced motion. axe measures contrast at the current
    // opacity, so a half-faded element (e.g. the "ready for offline use" toast) would be
    // reported; this way every element is checked in its final state.
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await page.goto(`./${screen.hash}`)
    await expect(page.locator('#app > *').first()).toBeVisible()
    await page.waitForLoadState('networkidle')

    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
      .analyze()
    const violations = results.violations.map(
      (v) => `${v.impact ?? 'unknown'} ${v.id}: ${v.help} (${v.nodes.map((n) => n.target.join(' ')).join(', ')})`,
    )
    expect(violations).toEqual([])
    expect(errors).toEqual([])
  })
}
