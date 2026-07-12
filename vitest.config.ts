import { fileURLToPath } from 'node:url'
import { mergeConfig, defineConfig, configDefaults } from 'vitest/config'
import viteConfig from './vite.config'

export default mergeConfig(
  viteConfig,
  defineConfig({
    test: {
      environment: 'jsdom',
      // Browser-mode specs run in a real browser via `vitest.browser.config.ts`;
      // keep them out of the default jsdom run (they'd fail without real layout).
      exclude: [...configDefaults.exclude, 'e2e/**', '**/*.browser.spec.ts'],
      root: fileURLToPath(new URL('./', import.meta.url)),
    },
  }),
)
