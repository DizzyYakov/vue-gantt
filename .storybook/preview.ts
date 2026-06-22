import type { Preview } from '@storybook/vue3-vite'
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
    docs: {
      toc: true,
    },
  },
  // Give every story a sans-serif context (the headless chart uses `font: inherit`).
  decorators: [() => ({ template: '<div class="sb-wrap"><story /></div>' })],
}

export default preview
