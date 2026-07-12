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
      // Coverage is only collected with `--coverage` (bun test:coverage), so the
      // default `vitest run` / CI stays fast and these thresholds don't gate it.
      coverage: {
        provider: 'v8',
        reporter: ['text', 'html'],
        include: ['src/**'],
        exclude: [
          'src/**/__tests__/**',
          'src/**/*.browser.spec.ts',
          'src/stories/**',
          'src/dev/**',
          'src/index.ts',
          'src/types.ts',
          '**/*.d.ts',
        ],
        // Floor set a few points below current (stmts ~95 / branch ~88 / funcs ~93 /
        // lines ~97) — a ratchet that catches real drops without instant red.
        thresholds: {
          statements: 90,
          branches: 82,
          functions: 88,
          lines: 92,
        },
      },
    },
  }),
)
