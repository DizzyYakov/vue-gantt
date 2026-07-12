import { test as base, expect } from '@playwright/test'

/**
 * Shared Playwright test with a console-error gate: any `console.error` or
 * uncaught page error during the test fails it. Auto-applied to every test that
 * uses the `page` fixture, so demo flows and the story sweep both get it for free.
 */
export const test = base.extend<{ consoleGuard: void }>({
  consoleGuard: [
    async ({ page }, use) => {
      const errors: string[] = []
      page.on('console', message => {
        if (message.type() === 'error') errors.push(`console.error: ${message.text()}`)
      })
      page.on('pageerror', error => errors.push(`pageerror: ${error.message}`))
      await use()
      expect(errors, `page logged errors:\n${errors.join('\n')}`).toEqual([])
    },
    { auto: true },
  ],
})

export { expect }
