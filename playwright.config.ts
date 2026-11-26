import { defineConfig, devices } from '@playwright/test'

/**
 * End-to-end and accessibility tests against the production build (`npm run build-only`),
 * served by `vite preview` under the real base path /riddles/.
 */
const PORT = 4173

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['github'], ['html', { open: 'never' }]] : 'list',
  use: {
    baseURL: `http://localhost:${PORT}/riddles/`,
    trace: 'retain-on-failure',
    serviceWorkers: 'allow',
    // Optional: another Chromium binary (e.g. a preinstalled one of a different version).
    launchOptions: { executablePath: process.env.CHROMIUM_PATH },
  },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'] } },
    { name: 'mobile', use: { ...devices['Pixel 7'] } },
  ],
  webServer: {
    command: `npx vite preview --port ${PORT} --strictPort`,
    url: `http://localhost:${PORT}/riddles/`,
    reuseExistingServer: !process.env.CI,
    timeout: 30_000,
  },
})
