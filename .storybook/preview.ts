import type { Preview } from '@storybook/vue3-vite'
// Viewport is built into Storybook core (v9+), so no extra addon is needed.
import { INITIAL_VIEWPORTS } from 'storybook/viewport'
// Ship the default theme so every story is styled; override --gantt-* per story.
import '../src/stories/sb.css'
import '../src/styles/gantt.css'

const preview: Preview = {
  parameters: {
    layout: 'padded',
    controls: {
      matchers: {
        date: /Date$/i,
      },
    },
    viewport: {
      options: INITIAL_VIEWPORTS,
    },
    docs: {
      toc: true,
    },
  },
  // Give every story a sans-serif context (the headless chart uses `font: inherit`).
  decorators: [() => ({ template: '<div class="sb-wrap"><story /></div>' })],
}

export default preview
