import { describe, expect, it } from 'vitest'
import { render } from 'vitest-browser-vue'
import Gantt from '../Gantt.vue'
import type { GanttRowData } from '../../index'

// A dataset wider and taller than the viewport, so both scroll axes are active
// and the frozen header/sidebar/corner have something to stay pinned over. Real
// `position: sticky` isn't simulated by jsdom — this needs a real browser.
const rows: GanttRowData[] = Array.from({ length: 40 }, (_, r) => ({
  id: `row-${r}`,
  name: `Row ${r + 1}`,
  tasks: [{ id: `t-${r}`, name: `T${r}`, start: '2026-01-01', end: '2026-06-30' }],
}))

function nextFrame(): Promise<void> {
  return new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve())))
}

describe('frozen header/sidebar stay pinned on scroll (real sticky)', () => {
  it('keeps the header at the top and the sidebar at the left after scrolling', async () => {
    const { container } = render(Gantt, {
      props: { rows, tiers: ['month', 'week', 'day'], columnWidth: 30, rowHeight: 36, height: 300 },
    })
    await nextFrame()

    const scroller = container.querySelector('.gantt') as HTMLElement
    const header = container.querySelector('.gantt__head') as HTMLElement
    const sidebar = container.querySelector('.gantt__sidebar') as HTMLElement
    const corner = container.querySelector('.gantt__corner') as HTMLElement

    // Scroll diagonally so both the vertical and horizontal sticky offsets engage.
    scroller.scrollTop = 400
    scroller.scrollLeft = 600
    scroller.dispatchEvent(new Event('scroll'))
    await nextFrame()

    const box = scroller.getBoundingClientRect()
    // Header sticks to the scroller's top edge; sidebar/corner to its left edge.
    expect(header.getBoundingClientRect().top).toBeCloseTo(box.top, 0)
    expect(sidebar.getBoundingClientRect().left).toBeCloseTo(box.left, 0)
    expect(corner.getBoundingClientRect().top).toBeCloseTo(box.top, 0)
    expect(corner.getBoundingClientRect().left).toBeCloseTo(box.left, 0)
  })
})
