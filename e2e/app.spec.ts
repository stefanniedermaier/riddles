import { expect, expectAccessible, test } from './fixtures'

const GAMES = ['sudoku', 'crowns', 'links', 'nonogram', 'arrows', 'shapes', 'merge', 'blocks', 'mines', 'pipes', 'watersort', 'codebreaker', 'solitaire', 'spider', 'freecell', 'tripeaks']
const PAGES = ['', 'settings', 'stats', 'privacy', 'imprint', ...GAMES]

test.describe('every page', () => {
  for (const path of PAGES) {
    for (const theme of ['light', 'dark'] as const) {
      test(`/${path} renders and is accessible (${theme})`, async ({ page }) => {
        await page.emulateMedia({ colorScheme: theme })
        await page.goto(`./#/${path}`)
        await expect(page.locator('main')).toBeVisible()
        await expect(page.locator('html')).toHaveAttribute('data-theme', theme)
        await expectAccessible(page)
      })
    }
  }
})

test('home lists all games and opens a game', async ({ page }) => {
  await page.goto('./')
  const cards = page.locator('.game-card')
  await expect(cards).toHaveCount(GAMES.length)
  await cards.first().click()
  await expect(page).toHaveURL(/#\/sudoku$/)
  await expect(page.locator('main')).toBeVisible()
})

test('unknown routes show the not-found page', async ({ page }) => {
  await page.goto('./#/does-not-exist')
  await expect(page.locator('main')).toBeVisible()
  await expectAccessible(page)
})

test('production build ships a Content-Security-Policy', async ({ page }) => {
  await page.goto('./')
  const csp = await page
    .locator('meta[http-equiv="Content-Security-Policy"]')
    .getAttribute('content')
  expect(csp).toContain("default-src 'self'")
  expect(csp).toContain("object-src 'none'")
})

test('works offline once the service worker is active', async ({ page, context }) => {
  await page.goto('./')
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready
  })
  await context.setOffline(true)
  await page.reload()
  await expect(page.locator('.game-card').first()).toBeVisible()
  await context.setOffline(false)
})

test('settings check for updates and report the latest version', async ({ page }) => {
  await page.goto('./')
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready
  })
  await page.goto('./#/settings')
  await page.getByRole('button', { name: 'Check for updates' }).click()
  await expect(page.getByText('You have the latest version.')).toBeVisible()
})
