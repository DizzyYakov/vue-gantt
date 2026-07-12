import { describe, expect, it } from 'vitest'
import { render } from 'vitest-browser-vue'
import Gantt from '../Gantt.vue'
import type { GanttRowData } from '../../index'

// 50 rows over a ~6-month day-tier range: in a 300px viewport only a window of
// rows fits, and the day columns far outnumber the visible pixels — so both axes
// virtualize. This is impossible to exercise in jsdom (no real layout / metrics).
const ROW_COUNT = 50
const rows: GanttRowData[] = Array.from({ length: ROW_COUNT }, (_, r) => ({
  id: `row-${r}`,
  name: `Row ${r + 1}`,
  tasks: [{ id: `t-${r}`, name: `T${r}`, start: '2026-01-01', end: '2026-06-30' }],
}))

/** Wait two animation frames (the viewport update is rAF-coalesced). */
function nextFrame(): Promise<void> {
  return new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve())))
}
/** Let the ResizeObserver-driven initial measure settle. */
function settle(): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, 60))
}

function rowIdsIn(container: Element): string[] {
  return [...container.querySelectorAll('.gantt-task-list__row')]
    .map(row => row.getAttribute('data-id'))
    .filter((id): id is string => Boolean(id))
}

describe('virtualization (real browser layout)', () => {
  it('renders only a window of rows and columns, and shifts it on scroll', async () => {
    const { container } = render(Gantt, {
      props: {
        rows,
        tiers: ['month', 'week', 'day'],
        columnWidth: 30,
        rowHeight: 36,
        height: 300,
        today: '2026-02-01',
      },
    })
    await settle()
    await nextFrame()

    // Row window: far fewer than all 50 rows fit in the 300px viewport, and it
    // starts at the top (row-0 shown, the last row not).
    const initialRows = rowIdsIn(container)
    expect(initialRows.length).toBeGreaterThan(0)
    expect(initialRows.length).toBeLessThan(ROW_COUNT)
    expect(initialRows).toContain('row-0')
    expect(initialRows).not.toContain('row-49')

    // Column window: the day tier spans ~180 columns but only a fraction render.
    const dayColumns = container.querySelectorAll('.gantt-grid__col').length
    expect(dayColumns).toBeGreaterThan(0)
    expect(dayColumns).toBeLessThan(150)

    // Scroll to the bottom: the row window shifts to the last rows.
    const scroller = container.querySelector('.gantt') as HTMLElement
    scroller.scrollTop = scroller.scrollHeight
    scroller.dispatchEvent(new Event('scroll'))
    await nextFrame()
    await settle()

    const scrolledRows = rowIdsIn(container)
    expect(scrolledRows).toContain('row-49')
    expect(scrolledRows).not.toContain('row-0')
  })
})
