import process from 'node:process'
import { defineConfig, devices } from '@playwright/test'

/**
 * Story sweep config: visits every Storybook story (built to `storybook-static/`
 * and served statically) across the desktop engines and gates on console errors +
 * strict axe a11y. Separate from `playwright.config.ts` (the demo functional
 * suite) so the two targets/servers don't overlap.
 *
 * Run via `bun test:stories` (builds Storybook first, then runs this config).
 */
export default defineConfig({
  testDir: './e2e/stories',
  timeout: 30 * 1000,
  expect: { timeout: 5000 },
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: [
    ['html', { outputFolder: 'playwright-report-stories', open: 'never' }],
    ['list'],
  ],
  use: {
    trace: 'on-first-retry',
    headless: true,
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'firefox', use: { ...devices['Desktop Firefox'] } },
    { name: 'webkit', use: { ...devices['Desktop Safari'] } },
  ],
  /* Serve the pre-built static Storybook (the `test:stories` script builds it). */
  webServer: {
    command: 'bunx http-server storybook-static -p 6006 --silent -c-1',
    url: 'http://localhost:6006',
    reuseExistingServer: !process.env.CI,
    timeout: 120 * 1000,
  },
})
