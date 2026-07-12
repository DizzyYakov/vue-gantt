import { test, expect } from '../fixtures'

test('renders the gantt demo with bars and a milestone', async ({ page }) => {
  await page.goto('/')
  await expect(page.locator('h1')).toContainText('vue-gantt')
  // Both demo modes render task bars.
  await expect(page.locator('.gantt-bar').first()).toBeVisible()
  await expect(page.locator('.gantt-milestone__diamond').first()).toBeVisible()
  await expect(page.locator('.gantt-dependency').first()).toBeVisible()
})
