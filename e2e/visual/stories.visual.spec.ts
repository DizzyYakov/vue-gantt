import fs from 'node:fs'
import path from 'node:path'
import { test, expect } from '@playwright/test'

/**
 * Visual-regression sweep: one screenshot per Storybook story, compared against a
 * committed baseline. Baselines are chromium/platform-specific (regenerate with
 * `--update-snapshots`). Served statically — see `playwright.visual.config.ts`.
 */
const STORYBOOK_URL = 'http://localhost:6006'
const indexPath = path.resolve('storybook-static/index.json')

// The 10k-task performance demos are heavy and add no visual signal.
const SKIP_ID_PREFIXES = ['guides-performance']

interface StoryEntry {
  id: string
  type: string
  title: string
  name: string
}

function loadStories(): StoryEntry[] {
  if (!fs.existsSync(indexPath)) {
    throw new Error(
      `storybook-static/index.json not found — build it first ` +
        `(the \`test:visual\` script runs \`build-storybook\` for you).`,
    )
  }
  const index = JSON.parse(fs.readFileSync(indexPath, 'utf8')) as {
    entries: Record<string, StoryEntry>
  }
  return Object.values(index.entries)
    .filter(entry => entry.type === 'story')
    .filter(entry => !SKIP_ID_PREFIXES.some(prefix => entry.id.startsWith(prefix)))
}

// Freeze the clock so the live "today" line renders at a fixed position every run
// (`setFixedTime` fixes `Date` without pausing timers/rAF, so rendering is intact).
test.beforeEach(async ({ page }) => {
  await page.clock.setFixedTime(new Date('2026-06-15T12:00:00'))
})

for (const story of loadStories()) {
  test(`${story.title} — ${story.name}`, async ({ page }) => {
    await page.goto(`${STORYBOOK_URL}/iframe.html?viewMode=story&id=${story.id}`)
    await expect(page.locator('#storybook-root > *').first()).toBeVisible()
    await expect(page.locator('#storybook-root')).toHaveScreenshot(`${story.id}.png`)
  })
}
