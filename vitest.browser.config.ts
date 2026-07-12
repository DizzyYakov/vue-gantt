import { fileURLToPath } from 'node:url'
import { playwright } from '@vitest/browser-playwright'
import { mergeConfig, defineConfig } from 'vitest/config'
import viteConfig from './vite.config'

/**
 * Browser-mode Vitest: runs `*.browser.spec.ts` in real Chromium/Firefox/WebKit
 * (via the Playwright provider) so tests exercise actual layout — virtualization,
 * `position: sticky`, scroll metrics and `getComputedStyle` — which jsdom fakes.
 *
 * Separate from `vitest.config.ts` (jsdom) so the default `vitest run` (CI/DoD)
 * stays jsdom-only and needs no browsers. Run with `bun test:browser`; install the
 * browsers once via `bunx playwright install`.
 */
export default mergeConfig(
  viteConfig,
  defineConfig({
    test: {
      root: fileURLToPath(new URL('./', import.meta.url)),
      include: ['src/**/__tests__/*.browser.spec.ts'],
      browser: {
        enabled: true,
        provider: playwright(),
        headless: true,
        // Deterministic viewport so content reliably overflows it (→ scrolling +
        // virtualization) regardless of the host default.
        viewport: { width: 1000, height: 660 },
        instances: [
          { browser: 'chromium' },
          { browser: 'firefox' },
          { browser: 'webkit' },
        ],
      },
    },
  }),
)
