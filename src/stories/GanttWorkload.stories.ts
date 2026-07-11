import type { Meta, StoryObj } from '@storybook/vue3-vite'
import GanttRoot from '../components/GanttRoot.vue'
import GanttView from '../components/GanttView.vue'
import GanttWorkload from '../components/GanttWorkload.vue'
import type { GanttResource, GanttRow } from '../types'

/**
 * A standalone, headless **load histogram** meant to sit BELOW the chart body: one
 * row per resource (label gutter the same width as `--gantt-sidebar-width` + a
 * track) showing how many of its assigned tasks run concurrently over time. It
 * reads the shared context (`useGanttContext`), so it must be mounted as a
 * descendant of `GanttRoot` — but it is **not** part of `GanttView`'s layout (no
 * dedicated slot there); place it as a sibling underneath, inside the same
 * `GanttRoot`.
 *
 * **Data:** driven by the exported sweep-line helper
 * `resourceWorkload(tasks, { resourceIds? })` — for each resource, the piecewise
 * `{ start, end, count }` segments where 1+ of its tasks overlap, plus its `peak`
 * (used to scale every bar's height so they're comparable across rows).
 * Milestones (zero-length) are ignored. Resources come from the `resources` prop
 * + each task's `resourceIds`, same as [Resources](/docs/guides-resources--docs).
 *
 * **Scroll sync:** the track mirrors the chart body's horizontal scroll via
 * `viewport.scrollLeft` (a `transform: translateX`), so its bars stay aligned
 * with the timeline above as you scroll — one-directional (the strip follows the
 * chart, not the other way around). Mount its container at the same width as the
 * chart above it for the alignment to hold.
 *
 * **Slots:** `label` (`{ resource, workload }`) replaces the per-row label
 * gutter; the default slot (`{ workload, peak, bars }`) replaces the whole bar
 * track — each `bars` entry carries pre-computed `{ segment, left, width,
 * heightRatio }` so a custom render positions its own bars without needing the
 * chart context inside the slot.
 *
 * **Theme** with `--gantt-workload-row-height`, `--gantt-workload-bar-bg` (a bar
 * uses its resource's own `color` when set, falling back to this token),
 * `--gantt-workload-bar-radius`, `--gantt-workload-bar-opacity` and
 * `--gantt-workload-label-font-size`.
 */
const meta: Meta<typeof GanttWorkload> = {
  title: 'Components/GanttWorkload',
  component: GanttWorkload,
  tags: ['autodocs'],
}
export default meta

type Story = StoryObj<typeof GanttWorkload>

const resources: GanttResource[] = [
  { id: 'alice', name: 'Alice', color: '#6366f1' },
  { id: 'bob', name: 'Bob', color: '#f59e0b' },
  { id: 'carol', name: 'Carol', color: '#10b981' },
]

// Alice is double-booked (spec + build overlap Jun 8-12, peak 2); Bob runs build
// then review back-to-back (peak 1); Carol only joins for review (peak 1) — so
// the three rows show different bar heights, scaled against the shared peak.
const rows: GanttRow[] = [
  {
    id: 'planning',
    name: 'Planning',
    tasks: [
      {
        id: 'spec',
        name: 'Spec',
        start: '2026-06-01',
        end: '2026-06-12',
        progress: 80,
        resourceIds: ['alice'],
      },
    ],
  },
  {
    id: 'dev',
    name: 'Development',
    tasks: [
      {
        id: 'build',
        name: 'Build',
        start: '2026-06-08',
        end: '2026-06-20',
        progress: 40,
        resourceIds: ['alice', 'bob'],
      },
      {
        id: 'review',
        name: 'Review',
        start: '2026-06-18',
        end: '2026-06-26',
        progress: 10,
        resourceIds: ['bob', 'carol'],
      },
    ],
  },
]

const components = { GanttRoot, GanttView, GanttWorkload }

function workloadChart(labelSlot = '') {
  return () => ({
    components,
    setup() {
      return { rows, resources }
    },
    template: /* html */ `
      <div style="max-width: 640px; border: 1px solid var(--gantt-grid-color, #e5e7eb); border-radius: 8px; overflow: hidden;">
        <GanttRoot :rows="rows" :resources="resources" :tiers="['month','week','day']" :column-width="36">
          <GanttView height="200" />
          <GanttWorkload>${labelSlot}</GanttWorkload>
        </GanttRoot>
      </div>
    `,
  })
}

/** Default label + bar rendering — one histogram row per resource, scroll-synced
 *  to the chart body above it. */
export const Default: Story = { render: workloadChart() }

/**
 * The `label` slot (`{ resource, workload }`) replaces the row's label gutter —
 * here a color dot plus the resource's peak concurrent load.
 */
export const CustomLabel: Story = {
  render: workloadChart(/* html */ `<template #label="{ resource, workload }">
      <span style="display:flex;align-items:center;gap:6px;font-size:.78em;white-space:nowrap;">
        <span
          style="width:8px;height:8px;border-radius:999px;flex:none;"
          :style="{ background: resource?.color || 'var(--gantt-workload-bar-bg, #6366f1)' }"
        />
        {{ resource?.name ?? workload.resourceId }} · peak {{ workload.peak }}
      </span>
    </template>`),
}
