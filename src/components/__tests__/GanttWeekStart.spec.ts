import { mount } from '@vue/test-utils'
import { ru } from 'date-fns/locale'
import { describe, expect, it } from 'vitest'
import { h } from 'vue'
import GanttRoot from '../GanttRoot.vue'
import { useGanttContext } from '../../composables/useGanttContext'
import type { GanttContext, GanttRow } from '../../types'

// A single task fully inside one week (Wed 2026-01-07 to Fri 2026-01-09), so the
// auto-derived range's snapped start/end land on a single week's boundaries —
// any week-start misalignment shows up directly as a wrong weekday.
const rows: GanttRow[] = [{ id: 'r1', tasks: [{ id: 'a', start: '2026-01-07', end: '2026-01-09' }] }]

function mountRoot(props: Record<string, unknown> = {}) {
  let captured!: GanttContext
  const Harness = {
    setup() {
      captured = useGanttContext()
      return () => h('div')
    },
  }
  const wrapper = mount(GanttRoot, {
    props: { rows, tiers: ['week'], columnWidth: 70, sidebarWidth: 200, ...props },
    slots: { default: () => h(Harness) },
  })
  return { wrapper, ctx: () => captured }
}

describe('auto-derived range — week locale / weekStartsOn', () => {
  it('defaults to a Sunday-aligned range without locale/weekStartsOn (regression guard)', () => {
    const { ctx } = mountRoot()
    expect(ctx().config.value.start.getDay()).toBe(0) // Sunday
    expect(ctx().config.value.end.getDay()).toBe(6) // Saturday (end of the same week)
  })

  it('aligns the auto-derived range to Monday for a Monday-start locale (`ru`)', () => {
    const { ctx } = mountRoot({ locale: ru })
    expect(ctx().config.value.start.getDay()).toBe(1) // Monday
    expect(ctx().config.value.end.getDay()).toBe(0) // Sunday (end of the same week)
  })

  it('lets `weekStartsOn` override the locale for the auto-derived range', () => {
    const { ctx } = mountRoot({ locale: ru, weekStartsOn: 0 })
    expect(ctx().config.value.start.getDay()).toBe(0) // Sunday, despite the `ru` locale
    expect(ctx().config.value.end.getDay()).toBe(6)
  })
})
