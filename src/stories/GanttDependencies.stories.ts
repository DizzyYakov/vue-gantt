import type { Meta, StoryObj } from '@storybook/vue3-vite'
import { noArrow, openArrow, triangleArrow } from '../arrowHeads'
import GanttDependencies from '../components/GanttDependencies.vue'
import { bezierPath, elbowPath, straightPath } from '../dependencyPaths'
import { declarativeChart } from './_shared'

/**
 * An SVG overlay drawing finish-to-start arrows between tasks based on each
 * task's `dependencies`. The arrowhead always enters the successor's start from
 * the left. Both the connector path builder (`dependencyShape`, a `(tail, head)
 * => string` function — `elbowPath` / `straightPath` / `bezierPath` or your own)
 * and the arrowhead builder (`arrowHead`, a `() => ArrowHeadShape | null` function
 * — `triangleArrow` / `openArrow` / `noArrow` or your own) are configured on
 * `GanttRoot`; the default slot can fully customise the rendered links.
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

/** `dependencyShape: elbowPath` (default) — orthogonal segments approaching from the left. */
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
