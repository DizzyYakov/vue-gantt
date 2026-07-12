import type { StorybookConfig } from '@storybook/vue3-vite'

const config: StorybookConfig = {
  stories: ['../src/**/*.mdx', '../src/**/*.stories.@(ts|tsx)'],
  addons: ['@storybook/addon-docs'],
  framework: {
    name: '@storybook/vue3-vite',
    options: {},
  },
  // Serve under a sub-path when hosting on GitHub Pages (project pages live at
  // `/<repo>/`); defaults to root for local dev / other hosts.
  async viteFinal(viteConfig) {
    viteConfig.base = process.env.STORYBOOK_BASE_PATH ?? '/'
    return viteConfig
  },
}

export default config
