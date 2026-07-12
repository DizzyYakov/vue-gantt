import { describe, expect, it } from 'vitest'
import { render } from 'vitest-browser-vue'
import Gantt from '../Gantt.vue'
// The dependency reroute-handle radius is read from the
// `--gantt-dependency-handle-radius` token via `getComputedStyle` (an SVG `r`
// attribute can't read a CSS variable). jsdom's `getComputedStyle` doesn't resolve
// custom properties, so this path only works in a real browser. Import the theme so
// the token (and its coarse/`[data-touch]` override) is defined.
import '../../styles/gantt.css'
import type { GanttRowData } from '../../index'

// Two linked tasks so a dependency arrow — and its reroute handle — renders.
const rows: GanttRowData[] = [
  { id: 'r1', name: 'R1', tasks: [{ id: 'a', name: 'A', start: '2026-01-01', end: '2026-01-06' }] },
  {
    id: 'r2',
    name: 'R2',
    tasks: [{ id: 'b', name: 'B', start: '2026-01-08', end: '2026-01-14', dependencies: ['a'] }],
  },
]

function settle(): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, 60))
}

function handleRadius(container: Element): string | null {
  return container.querySelector('.gantt-dependency-handle')?.getAttribute('r') ?? null
}

describe('dependency handle radius from a CSS token (real getComputedStyle)', () => {
  it('uses the default token radius', async () => {
    const { container } = render(Gantt, { props: { rows, unit: 'day', linkable: true } })
    await settle()
    // `--gantt-dependency-handle-radius` default is 4px.
    expect(handleRadius(container)).toBe('4')
  })

  it('enlarges the handle under touchTargets (`[data-touch]` token override)', async () => {
    const { container } = render(Gantt, { props: { rows, unit: 'day', linkable: true, touchTargets: true } })
    await settle()
    // The `[data-touch]` rule bumps the token to 9px.
    expect(handleRadius(container)).toBe('9')
  })
})
