import type { Meta, StoryObj } from '@storybook/vue3-vite'
import { noArrow, openArrow, triangleArrow } from '../arrowHeads'
import GanttDependencies from '../components/GanttDependencies.vue'
import { bezierPath, elbowPath, straightPath } from '../dependencyPaths'
import { declarativeChart, ganttComponents } from './_shared'

/**
 * An SVG overlay drawing typed dependency arrows between tasks based on each
 * task's `dependencies` array. Four link types are supported — the same four
 * as MS Project:
 *
 * - **FS** (Finish-to-Start, default): arrow leaves the predecessor's **end** edge,
 *   enters the successor's **start** edge.
 * - **SS** (Start-to-Start): tail at predecessor's **start**, head at successor's **start**.
 * - **FF** (Finish-to-Finish): tail at predecessor's **end**, head at successor's **end**.
 * - **SF** (Start-to-Finish): tail at predecessor's **start**, head at successor's **end**.
 *
 * A bare id string in `dependencies` is shorthand for FS/lag 0 (backward-compatible).
 * Pass a `GanttDependency` object for other types or a lag/lead offset:
 * `{ id: 'a', type: 'SS', lag: 2 }`.
 *
 * The connector path builder (`dependencyShape`) receives `DependencyPathHints`
 * (`tailDir`/`headDir`: ±1) so built-ins (`elbowPath`/`bezierPath`) route
 * correctly per type; two-parameter custom builders remain valid and render FS-style.
 * The arrowhead builder (`arrowHead`) is also configured on `GanttRoot`.
 * The default slot `<slot :links>` gives full control over rendering each link.
 */
const meta: Meta<typeof GanttDependencies> = {
  title: 'Components/GanttDependencies',
  component: GanttDependencies,
  tags: ['autodocs'],
  render: declarativeChart(),
}
export default meta

type Story = StoryObj<typeof GanttDependencies>

export const Default: Story = {}

/** `dependencyShape: elbowPath` (default) — orthogonal segments, FS-oriented. */
export const ShapeElbow: Story = {
  render: declarativeChart({ dependencyShape: elbowPath }),
}

/** `dependencyShape: straightPath` — a single straight line from tail to head. */
export const ShapeStraight: Story = {
  render: declarativeChart({ dependencyShape: straightPath }),
}

/** `dependencyShape: bezierPath` — a smooth cubic curve with horizontal entry/exit. */
export const ShapeBezier: Story = {
  render: declarativeChart({ dependencyShape: bezierPath }),
}

/** `arrowHead: triangleArrow` (default) — a filled triangle at the head. */
export const ArrowTriangle: Story = {
  render: declarativeChart({ arrowHead: triangleArrow }),
}

/** `arrowHead: openArrow` — an open (stroked, unfilled) chevron. */
export const ArrowOpen: Story = {
  render: declarativeChart({ arrowHead: openArrow }),
}

/** `arrowHead: noArrow` — connectors with no arrowhead. */
export const ArrowNone: Story = {
  render: declarativeChart({ arrowHead: noArrow }),
}

// ---------------------------------------------------------------------------
// Link-type stories — one per FS / SS / FF / SF + lag/lead + linkable UX.
// ---------------------------------------------------------------------------

/**
 * Build a minimal two-row chart whose rows/tasks are given by `body`. Optional
 * `rootProps` object adds extra attributes to `<GanttRoot>` (e.g.
 * `{ startDate: '2026-06-01' }` or `{ linkable: true }`). String values become
 * static HTML attributes; booleans become `:prop="true/false"` bindings.
 */
function depChart(body: string, rootProps: Record<string, unknown> = {}) {
  // Inline props directly in the template string so the runtime compiler
  // receives them as real attributes — v-bind spreading via setup() doesn't
  // reliably forward string props in the static Storybook build.
  const inlineAttrs = Object.entries(rootProps)
    .map(([key, val]) => {
      const attr = key.replace(/([A-Z])/g, c => `-${c.toLowerCase()}`)
      if (typeof val === 'boolean') return `:${attr}="${val}"`
      if (typeof val === 'string') return `${attr}="${val}"`
      return ''
    })
    .filter(Boolean)
    .join(' ')

  return () => ({
    components: ganttComponents,
    template: /* html */ `
      <GanttRoot :tiers="['month','week','day']" :column-width="40" ${inlineAttrs}>
        <div class="sb-chart">
          <div class="sb-chart__side">
            <div class="sb-chart__corner" />
            <GanttTaskList />
          </div>
          <div class="sb-chart__main">
            <GanttTimeline />
            <div class="sb-chart__body">
              <GanttGrid />
              ${body}
              <GanttDependencies />
              <GanttToday />
            </div>
          </div>
        </div>
      </GanttRoot>
    `,
  })
}

/**
 * **FS — Finish-to-Start** (the default): the arrow leaves the predecessor's **end**
 * edge and enters the successor's **start** edge. Pass `{ id, type: 'FS' }` or a
 * bare string — they are equivalent.
 */
export const LinkTypeFS: Story = {
  render: depChart(/* html */ `
    <GanttRow id="a" name="A (predecessor)">
      <GanttTask id="a" name="Task A" start="2026-06-01" end="2026-06-12" :progress="80" />
    </GanttRow>
    <GanttRow id="b" name="B (successor)">
      <GanttTask id="b" name="Task B" start="2026-06-12" end="2026-06-24" :progress="20"
        :dependencies="[{ id: 'a', type: 'FS' }]" />
    </GanttRow>
  `),
}

/**
 * **SS — Start-to-Start**: the arrow leaves the predecessor's **start** edge and
 * enters the successor's **start** edge. Both tasks can run in parallel; the
 * successor may not begin before the predecessor does.
 *
 * The chart is pinned a week before the tasks so the leftward stub has room to route.
 */
export const LinkTypeSS: Story = {
  render: depChart(
    /* html */ `
    <GanttRow id="a" name="A (predecessor)">
      <GanttTask id="a" name="Task A" start="2026-06-08" end="2026-06-24" :progress="60" />
    </GanttRow>
    <GanttRow id="b" name="B (successor)">
      <GanttTask id="b" name="Task B" start="2026-06-08" end="2026-06-20" :progress="30"
        :dependencies="[{ id: 'a', type: 'SS' }]" />
    </GanttRow>
  `,
    { startDate: '2026-06-01' },
  ),
}

/**
 * **FF — Finish-to-Finish**: the arrow leaves the predecessor's **end** edge and
 * enters the successor's **end** edge. The successor may not finish before the
 * predecessor does.
 */
export const LinkTypeFF: Story = {
  render: depChart(/* html */ `
    <GanttRow id="a" name="A (predecessor)">
      <GanttTask id="a" name="Task A" start="2026-06-12" end="2026-06-24" :progress="70" />
    </GanttRow>
    <GanttRow id="b" name="B (successor)">
      <GanttTask id="b" name="Task B" start="2026-06-01" end="2026-06-24" :progress="50"
        :dependencies="[{ id: 'a', type: 'FF' }]" />
    </GanttRow>
  `),
}

/**
 * **SF — Start-to-Finish** (uncommon): the arrow leaves the predecessor's **start**
 * edge and enters the successor's **end** edge. The successor (B) must finish before
 * the predecessor (A) starts — both tasks share Jun 15 as their boundary. The
 * leftward stub that exits A's start edge routes over the empty space to the left.
 */
export const LinkTypeSF: Story = {
  render: depChart(/* html */ `
    <GanttRow id="a" name="A (predecessor)">
      <GanttTask id="a" name="Task A" start="2026-06-15" end="2026-06-24" :progress="40" />
    </GanttRow>
    <GanttRow id="b" name="B (successor)">
      <GanttTask id="b" name="Task B" start="2026-06-01" end="2026-06-15" :progress="80"
        :dependencies="[{ id: 'a', type: 'SF' }]" />
    </GanttRow>
  `),
}

/**
 * **Lag & Lead**: a positive `lag` (days) delays the successor past the link
 * constraint; a negative `lag` (lead) allows the successor to overlap its
 * predecessor by that many days. Both are stored on the `GanttDependency` object.
 *
 * - Row B: FS + lag 3 → B starts 3 days after A ends.
 * - Row C: FS + lag −2 (lead) → C may start 2 days before A ends.
 */
export const LagAndLead: Story = {
  render: depChart(/* html */ `
    <GanttRow id="a" name="A (predecessor)">
      <GanttTask id="a" name="Task A" start="2026-06-01" end="2026-06-10" :progress="80" />
    </GanttRow>
    <GanttRow id="b" name="B (FS + 3d lag)">
      <GanttTask id="b" name="Task B" start="2026-06-13" end="2026-06-24" :progress="20"
        :dependencies="[{ id: 'a', type: 'FS', lag: 3 }]" />
    </GanttRow>
    <GanttRow id="c" name="C (FS − 2d lead)">
      <GanttTask id="c" name="Task C" start="2026-06-08" end="2026-06-18" :progress="10"
        :dependencies="[{ id: 'a', type: 'FS', lag: -2 }]" />
    </GanttRow>
  `),
}

/**
 * **Linkable — both-edge connectors**: with `linkable` on, each bar shows two
 * connector dot handles: one on the **start** edge (`.gantt-bar__connector--start`)
 * and one on the **end** edge (`--end`). Dragging from the start edge anchors the
 * tail at start, from the end at finish; the drop-target half picks the head edge.
 * Together they determine the link type created on release.
 */
export const LinkableBothEdges: Story = {
  render: depChart(
    /* html */ `
    <GanttRow id="backend" name="Backend">
      <GanttTask id="t1" name="Spec" start="2026-06-02" end="2026-06-10" :progress="80" />
    </GanttRow>
    <GanttRow id="frontend" name="Frontend">
      <GanttTask id="t2" name="UI" start="2026-06-10" end="2026-06-20" :progress="40"
        :dependencies="[{ id: 't1', type: 'FS' }]" />
    </GanttRow>
    <GanttRow id="qa" name="QA">
      <GanttTask id="t3" name="Testing" start="2026-06-18" end="2026-06-26" :progress="10"
        :dependencies="[{ id: 't2', type: 'FS' }]" />
    </GanttRow>
  `,
    { linkable: true },
  ),
}
