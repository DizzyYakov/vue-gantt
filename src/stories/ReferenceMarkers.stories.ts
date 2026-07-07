import type { Meta, StoryObj } from '@storybook/vue3-vite'
import Gantt from '../components/Gantt.vue'
import type { GanttMarker, GanttRow } from '../types'

// A project spanning three quarters, so both quarter boundaries and a mid-project
// release date fall inside the auto date range. Dated in 2027 (rather than the
// other guides' 2026) so the live `today` line doesn't coincidentally sit on top
// of a marker.
const rows: GanttRow[] = [
  {
    id: 'design',
    name: 'Design',
    tasks: [
      { id: 'design', name: 'Design', start: '2027-04-01', end: '2027-06-15', progress: 100 },
    ],
  },
  {
    id: 'build',
    name: 'Build',
    tasks: [
      {
        id: 'build',
        name: 'Build',
        start: '2027-06-01',
        end: '2027-09-15',
        progress: 55,
        dependencies: ['design'],
      },
    ],
  },
  {
    id: 'launch',
    name: 'Launch',
    tasks: [
      {
        id: 'harden',
        name: 'Hardening',
        start: '2027-09-01',
        end: '2027-11-15',
        progress: 10,
        dependencies: ['build'],
      },
    ],
  },
]

const defaultMarkers: GanttMarker[] = [
  { id: 'q3', date: '2027-07-01', label: 'Q3' },
  { id: 'q4', date: '2027-10-01', label: 'Q4' },
  { id: 'release', date: '2027-08-15', label: 'Release v2.0', meta: { kind: 'release' } },
]

// An inline-template helper so each story can also inject the optional `#marker`
// slot, like the declarative per-component stories do.
function markersChart(markers: GanttMarker[], slot = '') {
  return () => ({
    components: { Gantt },
    setup() {
      return { rows, markers }
    },
    template: /* html */ `
      <Gantt
        :rows="rows"
        :markers="markers"
        :tiers="['quarter', 'month']"
        :column-width="70"
        :row-height="40"
        :height="220"
      >${slot}</Gantt>
    `,
  })
}

/**
 * **Reference markers** draw labelled, full-height vertical lines at arbitrary
 * dates — quarter boundaries, a shared release date, a go-live. Unlike
 * [`GanttToday`](/docs/components-gantttoday--docs), which is pinned to the live
 * clock, a marker sits on any date you choose; unlike a task's `deadline`
 * (see [Deadlines & constraints](/docs/guides-deadlines-constraints--docs)),
 * which is bounded to that task's row, a marker spans the whole chart body.
 *
 * Pass a `markers` list (`{ id, date, label?, meta? }`) to `<Gantt>` / `<GanttRoot>`;
 * `<GanttMarkers>` renders it automatically. Markers are purely decorative — like
 * `periods` / `nonWorking`, they never extend the auto date range or add a header
 * row, and `label` is optional (omit it for a bare line).
 *
 * **Slots** (on `<Gantt>`): `marker-lines` replaces the whole overlay (`{ markers }`);
 * `marker` replaces a single line inside the default overlay (`{ marker }`, a
 * `ResolvedMarker` — `{ id, label, date, x, index, meta }`).
 *
 * **Theme** with `--gantt-marker-color` / `--gantt-marker-border` (the line),
 * `--gantt-marker-label-color` / `--gantt-marker-label-bg` /
 * `--gantt-marker-font-size` / `--gantt-marker-label-offset` /
 * `--gantt-marker-label-padding` (the label).
 */
const meta: Meta<typeof Gantt> = {
  title: 'Guides/Reference markers',
  component: Gantt,
  tags: ['autodocs'],
  render: markersChart(defaultMarkers),
}
export default meta

type Story = StoryObj<typeof Gantt>

/** Two quarter-boundary markers and a labelled release-date marker. */
export const Default: Story = {}

/**
 * `label` is optional — a marker without one renders as a bare dashed line, no
 * caption. Handy for lightweight guides that don't need a caption at every zoom
 * level.
 */
export const BareLines: Story = {
  render: markersChart([
    { id: 'q3', date: '2027-07-01' },
    { id: 'q4', date: '2027-10-01' },
    { id: 'release', date: '2027-08-15', label: 'Release v2.0' },
  ]),
}

/**
 * The `marker` leaf slot replaces the label inside the default overlay — here a
 * pill badge, colour-coded from `marker.meta.kind` (quarter boundaries in grey,
 * the release date in the accent colour).
 */
export const CustomMarker: Story = {
  render: markersChart(
    defaultMarkers,
    /* html */ `
      <template #marker="{ marker }">
        <span
          :style="{
            position: 'absolute',
            top: '4px',
            left: '4px',
            padding: '1px 6px',
            borderRadius: '3px',
            fontSize: '10px',
            fontWeight: '600',
            whiteSpace: 'nowrap',
            color: '#fff',
            background: marker.meta.kind === 'release' ? '#6366f1' : '#6b7280',
          }"
        >{{ marker.label || marker.id }}</span>
      </template>
    `,
  ),
}
