import type { Locator, Page } from '@playwright/test'
import { test, expect } from '../fixtures'

// End-to-end user-path flows: real pointer-drag gestures against the dev demo
// (which wires every interaction to controlled data), asserting the resulting
// re-render. Desktop only — the custom pointer gestures aren't reliable under the
// touch emulation of the Mobile projects.
test.beforeEach((_, testInfo) => {
  // Intentional project-based skip: the custom pointer gestures aren't reliable
  // under the Mobile projects' touch emulation.
  // eslint-disable-next-line playwright/no-skipped-test
  test.skip(
    testInfo.project.name.startsWith('Mobile'),
    'pointer-drag flows target desktop pointers',
  )
})

/** Drag an element by (dx, dy) with a real pointer sequence. */
async function dragBy(page: Page, target: Locator, dx: number, dy = 0): Promise<void> {
  await target.scrollIntoViewIfNeeded()
  const box = (await target.boundingBox())!
  const startX = box.x + box.width / 2
  const startY = box.y + box.height / 2
  await page.mouse.move(startX, startY)
  await page.mouse.down()
  await page.mouse.move(startX + dx, startY + dy, { steps: 12 })
  await page.mouse.up()
}

/** The x of a locator's bounding box (for `expect.poll`). */
async function boxX(target: Locator): Promise<number> {
  return (await target.boundingBox())!.x
}
async function boxWidth(target: Locator): Promise<number> {
  return (await target.boundingBox())!.width
}

test('drag-move: dragging a bar right reschedules it later', async ({ page }) => {
  await page.goto('/')
  const bar = page.getByTestId('chart-main').locator('.gantt-bar[data-id="spec"]')
  const startX = await boxX(bar)

  await dragBy(page, bar, 80)

  // The demo applies `applyMove` and re-renders the bar further right.
  await expect.poll(() => boxX(bar)).toBeGreaterThan(startX + 20)
})

test('resize: dragging the end handle widens the bar', async ({ page }) => {
  await page.goto('/')
  // `design` (progress 70) has its end inside the viewport and — unlike a 100%
  // bar — no progress handle over the right edge to intercept the grab.
  const bar = page.getByTestId('chart-main').locator('.gantt-bar[data-id="design"]')
  await bar.scrollIntoViewIfNeeded()
  const box = (await bar.boundingBox())!
  const startWidth = box.width

  // Grab the end edge near the TOP of the bar: the link connector sits over the
  // vertical centre of the right edge (above the resize handle), so a centred grab
  // would start a link instead of a resize.
  const edgeX = box.x + box.width - 3
  const topY = box.y + 4
  await page.mouse.move(edgeX, topY)
  await page.mouse.down()
  await page.mouse.move(edgeX + 80, topY, { steps: 12 })
  await page.mouse.up()

  await expect.poll(() => boxWidth(bar)).toBeGreaterThan(startWidth + 20)
})

test('drag-create: dragging across an empty row band creates a task', async ({ page }) => {
  await page.goto('/')
  const chart = page.getByTestId('chart-main')
  await chart.scrollIntoViewIfNeeded()
  const bars = chart.locator('.gantt-bar')
  const before = await bars.count()

  // Drag across the empty QA row's timeline band. Take the y from the QA sidebar
  // row (sticky, always in view) and x from the chart frame — past the 200px
  // sidebar — instead of scrolling the full-width grid band (which hscrolls the
  // chart differently across engines and shifts the coordinates).
  // Scroll the QA row into view via its narrow sticky sidebar row — a vertical-only
  // scroll (the sidebar is sticky, so no horizontal shift).
  const qaRow = chart.locator('.gantt-task-list__row[data-id="r-qa"]')
  await qaRow.scrollIntoViewIfNeeded()
  const chartBox = (await chart.boundingBox())!
  const qaBox = (await qaRow.boundingBox())!
  const y = qaBox.y + qaBox.height / 2
  const x0 = chartBox.x + 260
  await page.mouse.move(x0, y)
  await page.mouse.down()
  await page.mouse.move(x0 + 160, y, { steps: 12 })
  await page.mouse.up()

  await expect.poll(() => bars.count()).toBeGreaterThan(before)
})

test('dependency link: dragging between tasks adds an arrow', async ({ page }) => {
  await page.goto('/')
  const chart = page.getByTestId('chart-main')
  await chart.scrollIntoViewIfNeeded()
  const arrows = chart.locator('.gantt-dependency')
  const before = await arrows.count()

  // Link `spec` → `build` (both visible at scrollLeft 0, not yet related). Grab the
  // source's connector dot (right-centre of the bar) and drop on the target bar.
  const specBox = (await chart.locator('.gantt-bar[data-id="spec"]').boundingBox())!
  const buildBox = (await chart.locator('.gantt-bar[data-id="build"]').boundingBox())!
  const fromX = specBox.x + specBox.width - 6
  const fromY = specBox.y + specBox.height / 2
  await page.mouse.move(fromX, fromY)
  await page.mouse.down()
  await page.mouse.move(buildBox.x + 10, buildBox.y + buildBox.height / 2, { steps: 20 })
  await page.mouse.up()

  await expect.poll(() => arrows.count()).toBeGreaterThan(before)
})

test('group collapse: clicking a group header hides its member rows', async ({ page }) => {
  await page.goto('/')
  const chart = page.getByTestId('chart-grouped')
  const backendRows = chart.locator('.gantt-task-list__row[data-group="g-be"]')
  await expect(backendRows).toHaveCount(2)

  // Backend is the first (expanded) group; its header toggle collapses it.
  await chart.locator('.gantt-task-list__group-toggle').first().click()

  await expect(backendRows).toHaveCount(0)
})

test('keyboard: Shift+ArrowRight moves the focused bar one unit later', async ({ page }) => {
  await page.goto('/')
  const bar = page.getByTestId('chart-main').locator('.gantt-bar[data-id="spec"]')
  const startX = await boxX(bar)

  await bar.focus()
  await page.keyboard.press('Shift+ArrowRight')

  await expect.poll(() => boxX(bar)).toBeGreaterThan(startX)
})

test('undo: reverts a drag on the v-model chart', async ({ page }) => {
  await page.goto('/')
  const bar = page.getByTestId('chart-vmodel').locator('.gantt-bar[data-id="vm-spec"]')
  const startX = await boxX(bar)

  await dragBy(page, bar, 90)
  await expect.poll(() => boxX(bar)).toBeGreaterThan(startX + 20)
  const draggedX = await boxX(bar)

  await page.getByRole('button', { name: 'Undo', exact: true }).click()

  await expect.poll(() => boxX(bar)).toBeLessThan(draggedX - 20)
})
