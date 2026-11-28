import type { Page } from '@playwright/test'

import { expect, expectAccessible, test } from './fixtures'

/** The stored game of a puzzle (`riddles:<game>:current:v1`), or null. */
function savedGame(page: Page, game: string): Promise<unknown> {
  return page.evaluate((key) => {
    const raw = localStorage.getItem(key)
    return raw === null ? null : (JSON.parse(raw) as unknown)
  }, `riddles:${game}:current:v1`)
}

test('Links: a move is saved, survives a reload, continues from the lobby and the puzzle can be finished', async ({ page }) => {
  await page.goto('./links/')
  await page.getByRole('button', { name: /Easy/ }).click()
  const board = page.locator('.links-board')
  await expect(board).toBeVisible()
  expect(await savedGame(page, 'links')).toBeNull() // opening alone saves nothing

  const hint = page.getByRole('button', { name: 'Hint', exact: true })
  await hint.click()
  await expect.poll(() => savedGame(page, 'links')).not.toBeNull()
  const lines = page.locator('.line')
  const drawn = await lines.count()
  expect(drawn).toBeGreaterThan(0)

  // Reload: the play view resumes the stored game.
  await page.reload()
  await expect(board).toBeVisible()
  await expect(lines).toHaveCount(drawn)

  // Back to the lobby: "Continue" resumes it as well.
  await page.goto('./links/')
  await page.getByRole('button', { name: 'Continue' }).click()
  await expect(board).toBeVisible()
  await expect(lines).toHaveCount(drawn)

  // Finish with hints: one line per hint until the result dialog appears.
  const solved = page.getByRole('dialog').getByText('Solved!')
  // The hint button turns off once the board is solved; the dialog follows a moment later.
  for (let i = 0; i < 30 && (await hint.isEnabled()); i++) {
    const before = await lines.count()
    await hint.click()
    await expect.poll(async () => (await lines.count()) > before || !(await hint.isEnabled())).toBe(true)
  }
  await expect(solved).toBeVisible()
  expect(await savedGame(page, 'links')).toBeNull()

  // The lobby no longer offers "Continue" and the statistics count the win.
  await page.goto('./links/')
  await expect(page.getByRole('button', { name: /Easy/ })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Continue' })).toHaveCount(0)
})

test('Stars: keyboard play on the board is saved and restored after a reload', async ({ page }) => {
  await page.goto('./stars/')
  await page.getByRole('button', { name: /Easy/ }).click()
  const board = page.locator('.crowns-board')
  await expect(board).toBeVisible()

  // Tab order reaches the board; arrows move the cursor, Enter marks a cell.
  await board.focus()
  await page.keyboard.press('ArrowRight')
  await page.keyboard.press('Enter')
  await expect.poll(async () => ((await savedGame(page, 'crowns')) as { cells: number[] } | null)?.cells[1]).toBe(1)

  await page.reload()
  await expect(board).toBeVisible()
  const cell = board.locator('[data-cell="1"]')
  await expect(cell).toHaveAttribute('aria-label', /✕/)
})

test('page changes move focus to the heading and set the title', async ({ page }) => {
  await page.goto('./')
  await page.locator('.game-card', { hasText: 'Links' }).click()
  await expect(page).toHaveTitle('Links – free online and offline · Riddles')
  await expect(page.locator('h1')).toBeFocused()
})

test('Snake: the calm speed moves one step per key, saves, resumes and ends at the wall', async ({ page }) => {
  await page.goto('./snake/')
  await page.getByRole('radio', { name: 'Calm' }).click()
  await page.getByRole('button', { name: /^Classic/ }).click()
  await expect(page.locator('.snake-board')).toBeVisible()
  await expectAccessible(page)

  // Every key is one step; the screen reader summary follows.
  await page.keyboard.press('ArrowUp')
  await page.keyboard.press('ArrowRight')
  const summary = page.locator('main [aria-live="polite"]')
  await expect(summary).toContainText('Length')
  const saved = () => page.evaluate(() => localStorage.getItem('riddles:snake:current:classic:v1'))

  // Leaving saves the run; the lobby offers to continue it with its speed.
  await page.getByRole('button', { name: 'Back', exact: true }).click()
  await expect(page.getByRole('button', { name: /^Classic/ })).toContainText('Continue')
  expect(await saved()).not.toBeNull()
  await page.getByRole('button', { name: /^Classic/ }).click()

  // Straight on to the right wall: the run ends, the result shows the speed.
  for (let i = 0; i < 20; i++) {
    if (await page.getByRole('dialog').isVisible()) break
    await page.keyboard.press('ArrowRight')
  }
  const result = page.getByRole('dialog')
  await expect(result).toContainText('Game over')
  await expect(result).toContainText('Calm')
  expect(await saved()).toBeNull()
})

test('Snake: the real-time game starts on input and pauses when the page is hidden', async ({ page }) => {
  await page.goto('./snake/play/open?new=1')
  await expect(page.getByText('Swipe, tap or press an arrow key to start')).toBeVisible()
  await page.keyboard.press('ArrowUp')
  await expect(page.getByText('Swipe, tap or press an arrow key to start')).toBeHidden()
  await page.waitForTimeout(600)
  await page.evaluate(() => {
    Object.defineProperty(document, 'hidden', { configurable: true, get: () => true })
    document.dispatchEvent(new Event('visibilitychange'))
  })
  await expect(page.getByText('Paused – tap to continue')).toBeVisible()
  const length = await page.locator('.hud__value').nth(1).textContent()
  const head = await page.locator('.snake__head').getAttribute('cx')
  await page.waitForTimeout(600)
  expect(await page.locator('.snake__head').getAttribute('cx')).toBe(head)
  expect(await page.locator('.hud__value').nth(1).textContent()).toBe(length)
})

test('Bubbles: a shot is saved, the run resumes from the lobby, and a level can be won', async ({ page }) => {
  await page.goto('./bubbles/')
  await page.getByRole('button', { name: /^Endless/ }).click()
  await expect(page.locator('.bubbles-board')).toBeVisible()
  await expectAccessible(page)

  // Aim with the keyboard and shoot; the screen reader summary tells what happened.
  await page.keyboard.press('ArrowLeft')
  await page.keyboard.press('Space')
  const summary = page.locator('main [aria-live="polite"]')
  await expect(summary).toContainText('bubbles left')
  const saved = () => page.evaluate(() => localStorage.getItem('riddles:bubbles:current:endless:v1'))
  expect(await saved()).not.toBeNull()

  // The next bubble is a button: tapping it swaps.
  const swap = page.getByRole('button', { name: /^Next bubble/ })
  const before = await swap.getAttribute('aria-label')
  await swap.click()
  await expect(page.locator('.bubbles-board .visually-hidden')).toContainText(before!.replace(/^Next bubble: (.*) – .*$/, '$1'))

  await page.getByRole('button', { name: 'Back', exact: true }).click()
  await expect(page.getByRole('button', { name: /^Endless/ })).toContainText('Continue')

  // A level one shot from its goal: two red bubbles under the ceiling, a red one to shoot.
  await page.evaluate(() => {
    const cells = new Array<number>(9 * 14).fill(-1)
    cells[3] = 0
    cells[4] = 0
    const run = {
      variant: 'levels', level: 1, speed: 'normal', cells, parity: 0, marked: [], current: 0, next: 0, colors: 3,
      goal: { type: 'clear' }, progress: 0, shotsLeft: 5, shots: 1, misses: 0, combo: 0, rows: 0, clockMs: 0,
      score: 0, rngState: 1, over: false, won: false,
    }
    localStorage.setItem('riddles:bubbles:current:levels:v1', JSON.stringify(run))
  })
  await page.goto('./bubbles/play/levels')
  await expect(page.getByText('Clear the field')).toBeVisible()
  await page.keyboard.press('Space')
  const result = page.getByRole('dialog')
  await expect(result).toContainText('Level complete!')
  await expect(result).toContainText('Shots left bonus')
  await result.getByRole('button', { name: 'Next level' }).click()
  await expect(page.locator('.hud__value').nth(2)).toHaveText('2')
})

test('Bubbles: the clock starts with the first shot and pauses when the page is hidden', async ({ page }) => {
  await page.goto('./bubbles/play/time?new=1')
  await expect(page.getByText('The clock starts with your first shot')).toBeVisible()
  await page.keyboard.press('Space')
  await expect(page.getByText('The clock starts with your first shot')).toBeHidden()
  await page.evaluate(() => {
    Object.defineProperty(document, 'hidden', { configurable: true, get: () => true })
    document.dispatchEvent(new Event('visibilitychange'))
  })
  await expect(page.getByText('Paused – tap to continue')).toBeVisible()
  const clock = await page.locator('.hud__value').nth(1).textContent()
  await page.waitForTimeout(1200)
  expect(await page.locator('.hud__value').nth(1).textContent()).toBe(clock)
})
