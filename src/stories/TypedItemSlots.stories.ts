import type { Meta, StoryObj } from '@storybook/vue3-vite'
import Gantt from '../components/Gantt.vue'

/**
 * # Typed item slots
 *
 * Tag any task or milestone with a free-form `variant` to render each category
 * differently. The prop-driven render resolves the slot by variant:
 *
 * - a bar looks for a `task-${variant}` slot, a marker for `milestone-${variant}`;
 * - if none is provided it falls back to the generic `bar` / `milestone` slot;
 * - then to the built-in default.
 *
 * This lets you style whole classes of items (design vs dev work, release flags,
 * …) without branching inside a single slot. See also the generic `bar` slot in
 * [Custom rendering](/docs/components-gantt--custom-bar-slot).
 */
const meta: Meta<typeof Gantt> = {
  title: 'Guides/Typed item slots',
  component: Gantt,
  tags: ['autodocs'],
}
export default meta

/**
 * `design` and `dev` bars get their own look, `release` milestones get a labeled
 * flag, and an un-tagged bar (`variant` omitted) falls through to the generic
 * `#bar` slot.
 */
export const TypedItemSlots: StoryObj<typeof Gantt> = {
  render: () => ({
    components: { Gantt },
    setup: () => ({
      rows: [
        {
          id: 'r1',
          name: 'Design',
          tasks: [{ id: 'a', name: 'Wireframes', start: '2026-01-01', end: '2026-01-06', variant: 'design' }],
        },
        {
          id: 'r2',
          name: 'Build',
          tasks: [
            { id: 'b', name: 'API', start: '2026-01-04', end: '2026-01-12', variant: 'dev' },
            { id: 'c', name: 'Chore', start: '2026-01-13', end: '2026-01-16' },
          ],
        },
        {
          id: 'r3',
          name: 'Ship',
          tasks: [{ id: 'm', name: 'v1.0', type: 'milestone', start: '2026-01-18', variant: 'release' }],
        },
      ],
    }),
    template: `
      <Gantt :rows="rows" unit="day">
        <template #task-design="{ task }">
          <span style="padding:0 8px;font-size:.72em;font-weight:600;color:#7c3aed">🎨 {{ task.name }}</span>
        </template>
        <template #task-dev="{ task, progress }">
          <span style="padding:0 8px;font-size:.72em;font-weight:600;color:#0369a1">⚙️ {{ task.name }} · {{ progress }}%</span>
        </template>
        <template #milestone-release="{ task }">
          <span style="display:inline-block;padding:1px 6px;font-size:.68em;font-weight:700;white-space:nowrap;color:#fff;background:#16a34a;border-radius:4px;transform:translateX(-50%)">🚀 {{ task.name }}</span>
        </template>
        <template #bar="{ task }">
          <span style="padding:0 8px;font-size:.72em;opacity:.75">{{ task.name }}</span>
        </template>
      </Gantt>`,
  }),
}
