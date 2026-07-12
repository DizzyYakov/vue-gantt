import fs from 'node:fs'
import path from 'node:path'
import AxeBuilder from '@axe-core/playwright'
import type { Result } from 'axe-core'
import { test, expect } from '../fixtures'

/**
 * Sweep every Storybook story in a real browser and gate on two things:
 * - no `console.error` / uncaught error (via the shared `fixtures` console gate);
 * - zero axe accessibility violations (strict — all rules, incl. color-contrast).
 *
 * The stories are served statically (see `playwright.stories.config.ts`), built by
 * the `test:stories` script into `storybook-static/`. Each story becomes one test.
 */
const STORYBOOK_URL = 'http://localhost:6006'
const indexPath = path.resolve('storybook-static/index.json')

// Heavy stories excluded from the sweep: the 10k-task performance demos are slow
// to render and axe over that many nodes times out without adding coverage.
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
        `(the \`test:stories\` script runs \`build-storybook\` for you).`,
    )
  }
  const index = JSON.parse(fs.readFileSync(indexPath, 'utf8')) as {
    entries: Record<string, StoryEntry>
  }
  return Object.values(index.entries)
    .filter(entry => entry.type === 'story')
    .filter(entry => !SKIP_ID_PREFIXES.some(prefix => entry.id.startsWith(prefix)))
}

function formatViolations(violations: Result[]): string {
  return violations
    .map(violation => {
      const targets = violation.nodes.map(node => node.target.join(' ')).join(', ')
      return `[${violation.impact ?? 'n/a'}] ${violation.id}: ${violation.help} → ${targets}`
    })
    .join('\n')
}

for (const story of loadStories()) {
  test(`${story.title} — ${story.name}`, async ({ page }) => {
    await page.goto(`${STORYBOOK_URL}/iframe.html?viewMode=story&id=${story.id}`)
    // Web-first wait: the story has mounted content into the Storybook root.
    await expect(page.locator('#storybook-root > *').first()).toBeVisible()

    const { violations } = await new AxeBuilder({ page }).analyze()
    expect(violations, formatViolations(violations)).toEqual([])
  })
}
