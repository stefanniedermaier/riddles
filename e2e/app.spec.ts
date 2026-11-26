import { expect, expectAccessible, test } from './fixtures'

/** URL slugs of the games (Stars' id is `crowns`). */
const GAMES = ['sudoku', 'stars', 'links', 'nonogram', 'arrows', 'shapes', 'merge', 'blocks', 'mines', 'pipes', 'watersort', 'codebreaker', 'solitaire', 'spider', 'freecell', 'tripeaks']
const PAGES = ['', 'settings', 'stats', 'privacy', 'imprint', ...GAMES]

test.describe('every page', () => {
  for (const path of PAGES) {
    for (const theme of ['light', 'dark'] as const) {
      test(`/${path} renders and is accessible (${theme})`, async ({ page }) => {
        await page.emulateMedia({ colorScheme: theme })
        await page.goto(path ? `./${path}/` : './')
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
  await expect(page).toHaveURL(/\/riddles\/sudoku$/)
  await expect(page.locator('main')).toBeVisible()
})

test('unknown routes show the not-found page', async ({ page }) => {
  await page.goto('./does-not-exist/')
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
  await page.goto('./settings/')
  await page.getByRole('button', { name: 'Check for updates' }).click()
  await expect(page.getByText('You have the latest version.')).toBeVisible()
})

test.describe('addresses (plan 21)', () => {
  test('old hash links open the same page under its path', async ({ page }) => {
    await page.goto('./#/crowns?challenge=easy&result=1%3A23&kind=time')
    await expect(page).toHaveURL(/\/riddles\/stars\?challenge=easy&result=1(%3A|:)23&kind=time$/)
    await expect(page.locator('h1')).toHaveText('Stars')
    await page.goto('./#/sudoku')
    await expect(page).toHaveURL(/\/riddles\/sudoku$/)
  })

  test('German pages show the app in German, with German head and links', async ({ page }) => {
    await page.goto('./de/mines/')
    await expect(page.locator('html')).toHaveAttribute('lang', 'de')
    await expect(page.getByText('Neues Spiel')).toBeVisible()
    await expect(page).toHaveTitle('Mines – kostenlos online und offline · Riddles')
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', /\/riddles\/de\/mines\/$/)
    await page.goto('./de/')
    await page.locator('.game-card', { hasText: 'Sudoku' }).click()
    await expect(page).toHaveURL(/\/riddles\/de\/sudoku$/)
  })

  test('pages carry search engine data, and the static content stays hidden while the app runs', async ({ page }) => {
    await page.goto('./stars/')
    await expect(page.locator('h1')).toHaveText('Stars')
    await expect(page.locator('.prerender')).toHaveCount(0)
    await expect(page.locator('meta[property="og:image"]')).toHaveAttribute('content', /\/og\/en\/crowns\.jpg$/)
    await expect(page.locator('link[hreflang="de"]')).toHaveAttribute('href', /\/riddles\/de\/stars\/$/)
  })

  test('a page reload keeps the page (also play views)', async ({ page }) => {
    await page.goto('./merge/play/small?new=1')
    await expect(page.locator('.merge-board')).toBeVisible()
    await page.reload()
    await expect(page).toHaveURL(/\/riddles\/(merge\/play\/small|merge)$/)
    await page.goto('./stats/')
    await expect(page.locator('h1')).toHaveText('Statistics')
  })
})

test('without JavaScript a game page shows its static content', async ({ browser }) => {
  const context = await browser.newContext({ javaScriptEnabled: false })
  const page = await context.newPage()
  await page.goto('./de/sudoku/')
  await expect(page.locator('h1')).toHaveText('Sudoku')
  await expect(page.getByText('So wird gespielt')).toBeVisible()
  await expect(page.locator('a[hreflang="en"]')).toHaveAttribute('href', '/riddles/sudoku/')
  await context.close()
})
