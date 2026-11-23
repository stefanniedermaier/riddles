import { defineConfig, devices } from '@playwright/test'

/**
 * End-to-end smoke and accessibility tests against the production build (`vite preview`),
 * i.e. with the Content-Security-Policy and the service worker that users get.
 * Run `npm run build-only` first; `npm run test:e2e` starts the preview server itself.
 */
const port = 4173
const isCI = !!process.env.CI

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: isCI,
  retries: isCI ? 1 : 0,
  reporter: isCI ? [['github'], ['html', { open: 'never' }]] : 'list',
  use: {
    baseURL: `http://localhost:${port}/riddles/`,
    trace: 'retain-on-failure',
    // Lets the tests run with a Chromium that is already installed (e.g. in dev containers).
    launchOptions: process.env.PW_CHROMIUM_PATH
      ? { executablePath: process.env.PW_CHROMIUM_PATH }
      : {},
  },
  // Both layouts and both colour themes (light/dark tokens are checked separately by axe).
  projects: [
    { name: 'desktop-light', use: { ...devices['Desktop Chrome'], colorScheme: 'light' } },
    { name: 'mobile-dark', use: { ...devices['Pixel 7'], colorScheme: 'dark' } },
  ],
  webServer: {
    command: `npx vite preview --port ${port} --strictPort`,
    url: `http://localhost:${port}/riddles/`,
    reuseExistingServer: !isCI,
    timeout: 60_000,
  },
})
