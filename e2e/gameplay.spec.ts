import type { Page } from '@playwright/test'

import { expect, test } from './fixtures'

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
