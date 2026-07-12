import process from 'node:process'
import { defineConfig, devices } from '@playwright/test'

/**
 * Visual-regression config: screenshots every Storybook story (built to
 * `storybook-static/` and served statically) and compares against committed
 * baselines. **Chromium only** — screenshots differ across engines, so a single
 * engine keeps the baselines meaningful. Not part of the blocking CI (needs a
 * browser + platform-specific baselines).
 *
 * Run via `bun test:visual` (builds Storybook first). Regenerate baselines with
 * `bunx playwright test -c playwright.visual.config.ts --update-snapshots`.
 */
export default defineConfig({
  testDir: './e2e/visual',
  timeout: 30 * 1000,
  expect: {
    timeout: 5000,
    toHaveScreenshot: { maxDiffPixelRatio: 0.01, animations: 'disabled' },
  },
  forbidOnly: !!process.env.CI,
  retries: 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: [
    ['html', { outputFolder: 'playwright-report-visual', open: 'never' }],
    ['list'],
  ],
  use: { headless: true },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    command: 'bunx http-server storybook-static -p 6006 --silent -c-1',
    url: 'http://localhost:6006',
    reuseExistingServer: !process.env.CI,
    timeout: 120 * 1000,
  },
})
