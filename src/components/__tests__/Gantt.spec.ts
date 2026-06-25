import { mount } from '@vue/test-utils'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { h, nextTick } from 'vue'
import { useGanttContext } from '../../composables/useGanttContext'
import Gantt from '../Gantt.vue'
import GanttRoot from '../GanttRoot.vue'
import GanttRow from '../GanttRow.vue'
import GanttTask from '../GanttTask.vue'
import GanttTaskList from '../GanttTaskList.vue'
import type { GanttContext, GanttRow as GanttRowData } from '../../types'

const rows: GanttRowData[] = [
  {
    id: 'r1',
    name: 'Backend',
    tasks: [
      { id: 'a', name: 'Alpha', start: '2026-01-01', end: '2026-01-05', progress: 50 },
      { id: 'b', name: 'Beta', start: '2026-01-05', end: '2026-01-10', dependencies: ['a'] },
    ],
  },
  {
    id: 'r2',
    name: 'Frontend',
    tasks: [{ id: 'm', name: 'Mark', type: 'milestone', start: '2026-01-10' }],
  },
]

describe('Gantt (prop-driven)', () => {
  it('renders rows, bars, a milestone, dependency and today line', () => {
    const wrapper = mount(Gantt, { props: { rows, today: '2026-01-03' } })

    // Two task bars and one milestone diamond, across the rows.
    expect(wrapper.findAll('.gantt-bar')).toHaveLength(2)
    expect(wrapper.findAll('.gantt-milestone__diamond')).toHaveLength(1)

    // The sidebar shows ROW names (not task names) now.
    expect(wrapper.text()).toContain('Backend')
    expect(wrapper.text()).toContain('Frontend')

    const dep = wrapper.find('.gantt-dependency')
    expect(dep.attributes('data-from')).toBe('a')
    expect(dep.attributes('data-to')).toBe('b')
  })

  it('positions a bar using the shared scale', () => {
    const wrapper = mount(Gantt, {
      props: { rows, unit: 'day', columnWidth: 40, today: '2026-01-03' },
    })
    expect(wrapper.find('.gantt-bar').attributes('style')).toContain('left: 0px')
  })

  it('renders one timeline row per enabled time group, ordered coarse→fine', () => {
    const wrapper = mount(Gantt, { props: { rows, tiers: ['day', 'month', 'week'] } })
    const timelineRows = wrapper.findAll('.gantt-timeline__row')
    expect(timelineRows.map((r) => r.attributes('data-tier'))).toEqual(['month', 'week', 'day'])
  })
})

describe('grid + virtualization', () => {
  it('renders a body grid with one horizontal line per row', () => {
    const wrapper = mount(Gantt, { props: { rows, unit: 'day' } })
    expect(wrapper.findAll('.gantt-grid__col').length).toBeGreaterThan(0)
    expect(wrapper.findAll('.gantt-grid__row')).toHaveLength(rows.length)
  })

  it('renders a single scroll container with a frozen header/sidebar', () => {
    const wrapper = mount(Gantt, { props: { rows } })
    expect(wrapper.find('.gantt__head').exists()).toBe(true)
    expect(wrapper.find('.gantt__sidebar').exists()).toBe(true)
  })

  it('filters rows/tasks/columns to the reported viewport', async () => {
    let ctx!: GanttContext
    const lots: GanttRowData[] = Array.from({ length: 50 }, (_, i) => ({
      id: `r${i}`,
      tasks: [{ id: `t${i}`, start: '2026-01-01', end: '2026-03-31' }],
    }))

    const Harness = {
      setup() {
        ctx = useGanttContext()
        return () => h('div')
      },
    }
    mount(GanttRoot, {
      props: { rows: lots, unit: 'day', rowHeight: 20 },
      slots: { default: () => h(Harness) },
    })
    await nextTick()

    expect(ctx.visibleRows.value).toHaveLength(50)
    expect(ctx.visibleTasks.value).toHaveLength(50)

    ctx.setViewport({ scrollLeft: 0, scrollTop: 0, width: 400, height: 120 })
    await nextTick()
    expect(ctx.visibleRows.value.length).toBeLessThan(50)
    expect(ctx.visibleColumnsFor('day').length).toBeLessThan(ctx.columnsFor('day').length)
  })
})

// jsdom's MouseEvent has read-only clientX/button, so dispatch plain events.
function fire(target: EventTarget, type: string, props: Record<string, unknown>): void {
  target.dispatchEvent(Object.assign(new Event(type, { bubbles: true }), props))
}

async function drag(bar: Element, dx: number, dy: number): Promise<void> {
  fire(bar, 'pointerdown', { button: 0, clientX: 0, clientY: 0, pointerId: 1 })
  fire(window, 'pointermove', { clientX: dx, clientY: dy })
  fire(window, 'pointerup', {})
  await nextTick()
}

describe('drag & drop', () => {
  it('marks bars draggable only when enabled', () => {
    const off = mount(Gantt, { props: { rows } })
    expect(off.find('.gantt-bar').attributes('data-draggable')).toBeUndefined()
    const on = mount(Gantt, { props: { rows, draggable: true } })
    expect(on.find('.gantt-bar').attributes('data-draggable')).toBe('true')
  })

  it('emits a snapped, duration-preserving move within the same row', async () => {
    const wrapper = mount(Gantt, {
      props: {
        rows: [{ id: 'r1', tasks: [{ id: 'a', start: '2026-01-01', end: '2026-01-05' }] }],
        unit: 'day',
        columnWidth: 40,
        draggable: true,
      },
    })
    await drag(wrapper.find('.gantt-bar').element, 80, 0)

    const payload = wrapper.emitted('move')![0]![0] as {
      start: Date
      end: Date
      fromRowId: string
      toRowId: string
    }
    expect(payload.start.getDate()).toBe(3) // +2 days
    expect(payload.end.getDate()).toBe(7) // duration preserved
    expect(payload.fromRowId).toBe('r1')
    expect(payload.toRowId).toBe('r1') // same row (horizontal only)
  })

  it('moves with full precision (no grid snapping)', async () => {
    const wrapper = mount(Gantt, {
      props: {
        rows: [{ id: 'r1', tasks: [{ id: 'a', start: '2026-01-01', end: '2026-01-05' }] }],
        unit: 'day',
        columnWidth: 40,
        draggable: true,
      },
    })
    // 60px at 40px/day = +1.5 days → Jan 2, 12:00 (not snapped to a day).
    await drag(wrapper.find('.gantt-bar').element, 60, 0)
    const payload = wrapper.emitted('move')![0]![0] as { start: Date }
    expect(payload.start.getDate()).toBe(2)
    expect(payload.start.getHours()).toBe(12)
  })

  it('snaps to the base unit when snapToGrid is set', async () => {
    const wrapper = mount(Gantt, {
      props: {
        rows: [{ id: 'r1', tasks: [{ id: 'a', start: '2026-01-01', end: '2026-01-05' }] }],
        unit: 'day',
        columnWidth: 40,
        draggable: true,
        snapToGrid: true,
      },
    })
    // 70px = +1.75 days, snapped to the nearest whole day → Jan 3, 00:00.
    await drag(wrapper.find('.gantt-bar').element, 70, 0)
    const payload = wrapper.emitted('move')![0]![0] as { start: Date }
    expect(payload.start.getDate()).toBe(3)
    expect(payload.start.getHours()).toBe(0)
  })

  it('shows a translucent ghost + live time label while dragging', async () => {
    const wrapper = mount(Gantt, {
      props: {
        rows: [{ id: 'r1', tasks: [{ id: 'a', start: '2026-01-01', end: '2026-01-05' }] }],
        unit: 'day',
        columnWidth: 40,
        draggable: true,
      },
    })
    // Press + move without releasing → drag in progress.
    fire(wrapper.find('.gantt-bar').element, 'pointerdown', {
      button: 0,
      clientX: 0,
      clientY: 0,
      pointerId: 1,
    })
    fire(window, 'pointermove', { clientX: 60, clientY: 0 })
    await nextTick()

    expect(wrapper.find('.gantt-bar--ghost').exists()).toBe(true)
    expect(wrapper.find('.gantt-drag-label').text()).toContain('→')

    // Release to clean up listeners.
    fire(window, 'pointerup', {})
    await nextTick()
    expect(wrapper.find('.gantt-bar--ghost').exists()).toBe(false)
  })

  it('moves a task into another row on vertical drag when rowMovable', async () => {
    const wrapper = mount(Gantt, {
      props: {
        rows: [
          { id: 'r1', tasks: [{ id: 'a', start: '2026-01-01', end: '2026-01-03' }] },
          { id: 'r2', tasks: [] },
          { id: 'r3', tasks: [] },
        ],
        unit: 'day',
        rowHeight: 40,
        rowMovable: true,
      },
    })
    await drag(wrapper.find('.gantt-bar').element, 0, 85)

    const payload = wrapper.emitted('move')![0]![0] as {
      id: string
      fromRowId: string
      toRowId: string
    }
    expect(payload.id).toBe('a')
    expect(payload.fromRowId).toBe('r1')
    expect(payload.toRowId).toBe('r3') // dropped ~2 rows down
  })

  it('moves a lower-lane task out of a tall lanes row with a modest drag', async () => {
    const wrapper = mount(Gantt, {
      props: {
        rows: [
          {
            id: 'r1',
            tasks: [
              { id: 'a', start: '2026-01-01', end: '2026-01-10' }, // lane 0
              { id: 'b', start: '2026-01-05', end: '2026-01-15' }, // lane 1 (lower)
            ],
          },
          { id: 'r2', tasks: [] },
        ],
        unit: 'day',
        rowHeight: 40, // r1 is 80px tall (2 lanes), r2 starts at y=80
        overlap: 'lanes',
        rowMovable: true,
      },
    })
    // b's band centre ≈ 60; dragging just 30px reaches r2 (top 80). With the old
    // row-centre anchor this needed a full row-height more.
    await drag(wrapper.find('.gantt-bar[data-id="b"]').element, 0, 30)

    const payload = wrapper.emitted('move')![0]![0] as { id: string; toRowId: string }
    expect(payload.id).toBe('b')
    expect(payload.toRowId).toBe('r2')
  })
})

describe('drag ghost across rows (lane offset)', () => {
  // Pull the px value out of a `translateY(<n>px)` transform.
  function translateY(el: { attributes: (a: string) => string | undefined }): number {
    return parseFloat(el.attributes('style')!.match(/translateY\(([-\d.]+)px\)/)![1]!)
  }

  function startDrag(bar: Element, dy: number): void {
    fire(bar, 'pointerdown', { button: 0, clientX: 0, clientY: 0, pointerId: 1 })
    fire(window, 'pointermove', { clientX: 0, clientY: dy })
  }

  it('lanes: snaps a lower-lane ghost to the target row top, not one lane below', async () => {
    const wrapper = mount(Gantt, {
      props: {
        rows: [
          {
            id: 'r1',
            tasks: [
              { id: 'a', start: '2026-01-01', end: '2026-01-10' }, // lane 0
              { id: 'b', start: '2026-01-05', end: '2026-01-15' }, // lane 1
            ],
          },
          { id: 'r2', tasks: [] },
        ],
        unit: 'day',
        rowHeight: 40, // r1 = 80px tall, r2 top = 80
        overlap: 'lanes',
        rowMovable: true,
      },
    })
    // b's band: top 40 (lane 1). Dragging 30px puts the band centre (60) into r2.
    startDrag(wrapper.find('.gantt-bar[data-id="b"]').element, 30)
    await nextTick()
    // Ghost base sits at band.top (40); to reach r2's top (80) it must shift +40,
    // NOT +80 (the old row-top-only delta would drop it a lane below r2).
    expect(translateY(wrapper.find('.gantt-bar--ghost'))).toBeCloseTo(40, 1)
    fire(window, 'pointerup', {})
  })

  it('cascade: offsets a lower-lane ghost to the target row top', async () => {
    const wrapper = mount(Gantt, {
      props: {
        rows: [
          {
            id: 'r1',
            tasks: [
              { id: 'a', start: '2026-01-01', end: '2026-01-10' },
              { id: 'b', start: '2026-01-05', end: '2026-01-15' },
            ],
          },
          { id: 'r2', tasks: [] },
        ],
        unit: 'day',
        rowHeight: 40, // cascade rows stay 40px; r2 top = 40
        overlap: 'cascade',
        rowMovable: true,
      },
    })
    // b is staggered down by the cascade step (8px), so band.top = 8.
    startDrag(wrapper.find('.gantt-bar[data-id="b"]').element, 30)
    await nextTick()
    // Reach r2's top (40) from band.top (8) → +32.
    expect(translateY(wrapper.find('.gantt-bar--ghost'))).toBeCloseTo(32, 1)
    fire(window, 'pointerup', {})
  })

  it('keeps a lower-lane ghost in place on a horizontal-only move', async () => {
    const wrapper = mount(Gantt, {
      props: {
        rows: [
          {
            id: 'r1',
            tasks: [
              { id: 'a', start: '2026-01-01', end: '2026-01-10' },
              { id: 'b', start: '2026-01-05', end: '2026-01-15' },
            ],
          },
        ],
        unit: 'day',
        columnWidth: 40,
        rowHeight: 40,
        overlap: 'lanes',
        draggable: true, // horizontal only
      },
    })
    fire(wrapper.find('.gantt-bar[data-id="b"]').element, 'pointerdown', {
      button: 0,
      clientX: 0,
      clientY: 0,
      pointerId: 1,
    })
    fire(window, 'pointermove', { clientX: 80, clientY: 0 }) // move right, same row
    await nextTick()
    // Same row → no vertical shift; the ghost stays in lane 1.
    expect(translateY(wrapper.find('.gantt-bar--ghost'))).toBe(0)
    fire(window, 'pointerup', {})
  })

  it('commits the correct target row for a lower-lane task', async () => {
    const wrapper = mount(Gantt, {
      props: {
        rows: [
          {
            id: 'r1',
            tasks: [
              { id: 'a', start: '2026-01-01', end: '2026-01-10' },
              { id: 'b', start: '2026-01-05', end: '2026-01-15' },
            ],
          },
          { id: 'r2', tasks: [] },
        ],
        unit: 'day',
        rowHeight: 40,
        overlap: 'lanes',
        rowMovable: true,
      },
    })
    await drag(wrapper.find('.gantt-bar[data-id="b"]').element, 0, 30)
    const payload = wrapper.emitted('move')![0]![0] as { id: string; toRowId: string }
    expect(payload.id).toBe('b')
    expect(payload.toRowId).toBe('r2')
  })
})

describe('current-time line', () => {
  afterEach(() => vi.useRealTimers())

  it('positions at the live time and advances every second', async () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date(2026, 0, 2, 0, 0, 0)) // within range, midnight

    const wrapper = mount(Gantt, {
      props: {
        rows: [{ id: 'r', tasks: [{ id: 'a', start: '2026-01-01', end: '2026-01-10' }] }],
        unit: 'day',
        columnWidth: 48,
      },
    })
    await nextTick()
    const leftPx = () => parseFloat(wrapper.find('.gantt-today').attributes('style')!.match(/left:\s*([\d.]+)px/)![1]!)
    // Jan 2 00:00 → 1 day from origin × 48px.
    expect(leftPx()).toBeCloseTo(48, 5)

    // 12 hours later, a tick repositions the line (with second-level precision).
    vi.setSystemTime(new Date(2026, 0, 2, 12, 0, 0))
    vi.advanceTimersByTime(1000)
    await nextTick()
    expect(leftPx()).toBeCloseTo(72, 1)
  })
})

describe('overlap modes', () => {
  // r1 has two overlapping tasks; r2 has one.
  const overlapRows: GanttRowData[] = [
    {
      id: 'r1',
      name: 'Team',
      tasks: [
        { id: 'a', start: '2026-01-01', end: '2026-01-10' },
        { id: 'b', start: '2026-01-05', end: '2026-01-15' },
      ],
    },
    { id: 'r2', name: 'QA', tasks: [{ id: 'c', start: '2026-01-02', end: '2026-01-04' }] },
  ]

  it('lanes: grows the overlapping row to laneCount × rowHeight', () => {
    const wrapper = mount(Gantt, { props: { rows: overlapRows, overlap: 'lanes', rowHeight: 30 } })
    const row = wrapper.find('.gantt-task-list__row[data-id="r1"]')
    expect(row.attributes('style')).toContain('height: 60px') // 2 lanes × 30
    const qa = wrapper.find('.gantt-task-list__row[data-id="r2"]')
    expect(qa.attributes('style')).toContain('height: 30px')
    expect(qa.attributes('style')).toContain('top: 60px') // sits below the taller row
  })

  it('overlap: flags overlapping bars for translucency', () => {
    const wrapper = mount(Gantt, { props: { rows: overlapRows, overlap: 'overlap' } })
    expect(wrapper.findAll('.gantt-task[data-overlapping]')).toHaveLength(2) // a + b
  })

  it('conflict: renders the hatched overlap overlay', () => {
    const wrapper = mount(Gantt, { props: { rows: overlapRows, overlap: 'conflict' } })
    expect(wrapper.find('.gantt-conflicts').exists()).toBe(true)
    expect(wrapper.findAll('.gantt-conflicts__outline').length).toBeGreaterThan(0)
  })

  it('renders a custom `conflicts` slot instead of the default GanttConflicts', () => {
    // arrange + act
    const wrapper = mount(Gantt, {
      props: { rows: overlapRows, overlap: 'conflict' },
      slots: {
        conflicts: () => h('div', { class: 's-conflicts' }, 'custom'),
      },
    })

    // assert: the default SVG overlay is replaced by the custom content.
    expect(wrapper.find('.gantt-conflicts').exists()).toBe(false)
    expect(wrapper.find('.s-conflicts').exists()).toBe(true)
  })

  it('passes a non-empty GanttConflict[] (not a ComputedRef) into the slot', () => {
    // arrange: capture the scoped prop the slot receives.
    let received: unknown = undefined
    const wrapper = mount(Gantt, {
      props: { rows: overlapRows, overlap: 'conflict' },
      slots: {
        conflicts: (p: { conflicts: unknown }) => {
          received = p.conflicts
          return h('div', { class: 's-conflicts' })
        },
      },
    })

    // assert: it's a plain array (unwrapped), not a ComputedRef object.
    expect(wrapper.find('.s-conflicts').exists()).toBe(true)
    expect(Array.isArray(received)).toBe(true)
    // r1 has overlapping tasks (a/b), so there is at least one conflict segment.
    expect((received as unknown[]).length).toBeGreaterThan(0)
    // Each entry is a resolved conflict descriptor with pixel geometry.
    const first = (received as { rowId: string; x: number; width: number }[])[0]!
    expect(first.rowId).toBe('r1')
    expect(typeof first.x).toBe('number')
    expect(first.width).toBeGreaterThan(0)
  })

  it('renders the default GanttConflicts when no slot is provided (regression)', () => {
    // conflict mode → default overlay present.
    const conflict = mount(Gantt, { props: { rows: overlapRows, overlap: 'conflict' } })
    expect(conflict.find('.gantt-conflicts').exists()).toBe(true)

    // outside conflict mode → no overlay at all.
    const lanes = mount(Gantt, { props: { rows: overlapRows, overlap: 'lanes' } })
    expect(lanes.find('.gantt-conflicts').exists()).toBe(false)
  })

  it('gives the slot an empty array outside conflict mode', () => {
    let received: unknown = undefined
    mount(Gantt, {
      props: { rows: overlapRows, overlap: 'lanes' },
      slots: {
        conflicts: (p: { conflicts: unknown }) => {
          received = p.conflicts
          return h('div')
        },
      },
    })
    expect(Array.isArray(received)).toBe(true)
    expect((received as unknown[]).length).toBe(0)
  })

  it('keeps uniform rows when there is no overlap', () => {
    const wrapper = mount(Gantt, {
      props: {
        rows: [{ id: 'r', tasks: [{ id: 'x', start: '2026-01-01', end: '2026-01-05' }] }],
        overlap: 'lanes',
        rowHeight: 30,
      },
    })
    expect(wrapper.find('.gantt-task-list__row[data-id="r"]').attributes('style')).toContain(
      'height: 30px',
    )
  })
})

describe('slot forwarding', () => {
  it('forwards container-replacing slots (corner/timeline/sidebar/grid/…)', () => {
    const wrapper = mount(Gantt, {
      props: { rows, today: '2026-01-03' },
      slots: {
        corner: () => h('span', { class: 's-corner' }, 'C'),
        timeline: () => h('div', { class: 's-timeline' }, 'T'),
        sidebar: () => h('div', { class: 's-sidebar' }, 'S'),
        grid: () => h('div', { class: 's-grid' }),
        dependencies: () => h('div', { class: 's-deps' }),
        today: () => h('div', { class: 's-today' }),
        'body-extra': () => h('div', { class: 's-extra' }),
      },
    })

    for (const cls of ['s-corner', 's-timeline', 's-sidebar', 's-grid', 's-deps', 's-today', 's-extra']) {
      expect(wrapper.find(`.${cls}`).exists()).toBe(true)
    }
  })

  it('forwards per-item slots (row/column/bar/milestone)', () => {
    const wrapper = mount(Gantt, {
      props: { rows, today: '2026-01-03' },
      slots: {
        row: (p: { row: unknown }) => h('span', { class: 's-row' }, (p.row as { name: string }).name),
        column: (p: { column: unknown }) =>
          h('span', { class: 's-col' }, (p.column as { label: string }).label),
        bar: (p: { task: unknown }) => h('span', { class: 's-bar' }, (p.task as { name: string }).name),
        milestone: (p: { task: unknown }) =>
          h('span', { class: 's-ms' }, (p.task as { name: string }).name),
      },
    })

    for (const cls of ['s-row', 's-col', 's-bar', 's-ms']) {
      expect(wrapper.find(`.${cls}`).exists()).toBe(true)
    }
  })

  it('applies the height prop to the scroll viewport', () => {
    const wrapper = mount(Gantt, { props: { rows, height: 250 } })
    expect(wrapper.find('.gantt').attributes('style')).toContain('max-height: 250px')
  })

  it('re-emits a move event from the inner GanttRoot', async () => {
    const wrapper = mount(Gantt, {
      props: {
        rows: [{ id: 'r1', tasks: [{ id: 'a', start: '2026-01-01', end: '2026-01-05' }] }],
        unit: 'day',
        columnWidth: 40,
        draggable: true,
      },
    })
    await drag(wrapper.find('.gantt-bar').element, 80, 0)
    expect(wrapper.emitted('move')).toHaveLength(1)
  })
})

describe('section slot scoped payloads', () => {
  // Two grouped rows (so `group-bars`/`sidebar.groups` are non-empty) plus a
  // dependency and a milestone, exercising every section slot's scope.
  const groups = [{ id: 'g1', name: 'Squad' }]
  const groupedRows: GanttRowData[] = [
    {
      id: 'r1',
      name: 'Backend',
      groupId: 'g1',
      tasks: [
        { id: 'a', name: 'Alpha', start: '2026-01-01', end: '2026-01-05', progress: 50 },
        { id: 'b', name: 'Beta', start: '2026-01-05', end: '2026-01-10', dependencies: ['a'] },
      ],
    },
    {
      id: 'r2',
      name: 'Frontend',
      groupId: 'g1',
      tasks: [{ id: 'm', name: 'Mark', type: 'milestone', start: '2026-01-10' }],
    },
  ]

  // Capture a slot's scoped payload into `cap` and render an inert probe so the
  // section still mounts (and its default content is replaced).
  function capture(name: string): { cap: Record<string, unknown> } {
    const cap: Record<string, unknown> = {}
    mount(Gantt, {
      props: { rows: groupedRows, groups, unit: 'day', today: '2026-01-03' },
      slots: {
        [name]: (p: Record<string, unknown>) => {
          Object.assign(cap, p)
          return h('i', { class: 'probe' })
        },
      },
    })
    return { cap }
  }

  it('corner → { config } object carrying the resolved unit', () => {
    const { cap } = capture('corner')
    expect(typeof cap.config).toBe('object')
    expect((cap.config as { unit: string }).unit).toBe('day')
  })

  it('timeline → { config, visibleColumnsFor } with a column-generating fn', () => {
    const { cap } = capture('timeline')
    expect(typeof cap.config).toBe('object')
    expect(typeof cap.visibleColumnsFor).toBe('function')
    const cols = (cap.visibleColumnsFor as (t: string) => unknown[])('day')
    expect(Array.isArray(cols)).toBe(true)
  })

  it('sidebar → { rows, groups } both arrays (groups non-empty)', () => {
    const { cap } = capture('sidebar')
    expect(Array.isArray(cap.rows)).toBe(true)
    expect(Array.isArray(cap.groups)).toBe(true)
    expect((cap.groups as unknown[]).length).toBeGreaterThan(0)
  })

  it('grid → { columns (non-empty array), rows (array) }', () => {
    const { cap } = capture('grid')
    expect(Array.isArray(cap.columns)).toBe(true)
    expect((cap.columns as unknown[]).length).toBeGreaterThan(0)
    expect(Array.isArray(cap.rows)).toBe(true)
  })

  it('group-bars → { groups } non-empty array', () => {
    const { cap } = capture('group-bars')
    expect(Array.isArray(cap.groups)).toBe(true)
    expect((cap.groups as unknown[]).length).toBeGreaterThan(0)
  })

  it('bars → { tasks } array of the plotted (visible) tasks', () => {
    const { cap } = capture('bars')
    expect(Array.isArray(cap.tasks)).toBe(true)
    expect((cap.tasks as { id: string }[]).map((t) => t.id).sort()).toEqual(['a', 'b', 'm'])
  })

  it('bars slot replaces the default task/milestone layer', () => {
    const wrapper = mount(Gantt, {
      props: { rows: groupedRows, groups, unit: 'day' },
      slots: { bars: () => h('i', { class: 'custom-bars' }) },
    })
    expect(wrapper.find('.custom-bars').exists()).toBe(true)
    // Default bars/milestones are no longer rendered.
    expect(wrapper.find('.gantt-bar').exists()).toBe(false)
    expect(wrapper.find('.gantt-milestone').exists()).toBe(false)
  })

  it('dependencies → { tasks } array with every task', () => {
    const { cap } = capture('dependencies')
    expect(Array.isArray(cap.tasks)).toBe(true)
    // a + b + milestone m = 3 tasks across both rows.
    expect((cap.tasks as unknown[]).length).toBe(3)
    expect((cap.tasks as { id: string }[]).map((t) => t.id).sort()).toEqual(['a', 'b', 'm'])
  })

  it('today → { today: Date, dateToX: fn } where dateToX(today) is a number', () => {
    const { cap } = capture('today')
    expect(cap.today).toBeInstanceOf(Date)
    expect(typeof cap.dateToX).toBe('function')
    const x = (cap.dateToX as (d: Date) => unknown)(cap.today as Date)
    expect(typeof x).toBe('number')
  })

  it('body-extra → { contentWidth, contentHeight } positive numbers', () => {
    const { cap } = capture('body-extra')
    expect(typeof cap.contentWidth).toBe('number')
    expect(typeof cap.contentHeight).toBe('number')
    expect(cap.contentWidth as number).toBeGreaterThan(0)
    expect(cap.contentHeight as number).toBeGreaterThan(0)
  })

  it('renders all default section content when no slots are given (regression)', () => {
    // The today line tracks the LIVE clock, not the `today` prop — pin "now"
    // inside the Jan 2026 range so the default GanttToday is visible.
    vi.useFakeTimers()
    vi.setSystemTime(new Date(2026, 0, 3, 0, 0, 0))
    try {
      const wrapper = mount(Gantt, {
        props: { rows: groupedRows, groups, unit: 'day', today: '2026-01-03' },
      })
      // Each section keeps its default component.
      expect(wrapper.find('.gantt__corner').exists()).toBe(true)
      expect(wrapper.find('.gantt-timeline').exists()).toBe(true)
      expect(wrapper.find('.gantt-task-list').exists()).toBe(true)
      expect(wrapper.find('.gantt-grid').exists()).toBe(true)
      expect(wrapper.find('.gantt-bar').exists()).toBe(true)
      expect(wrapper.find('.gantt-dependencies').exists()).toBe(true)
      expect(wrapper.find('.gantt-today').exists()).toBe(true)
      // No probe leaked in.
      expect(wrapper.find('.probe').exists()).toBe(false)
    } finally {
      vi.useRealTimers()
    }
  })
})

describe('declarative (GanttRow + GanttTask)', () => {
  it('collects rows and their tasks from child components', async () => {
    const wrapper = mount({
      components: { GanttRoot, GanttTaskList, GanttRow, GanttTask },
      template: `
        <GanttRoot unit="day">
          <GanttTaskList />
          <GanttRow id="x" name="Xeno">
            <GanttTask id="t1" start="2026-01-01" end="2026-01-04" />
            <GanttTask id="t2" start="2026-01-04" end="2026-01-08" />
          </GanttRow>
          <GanttRow id="y" name="Yotta">
            <GanttTask id="t3" start="2026-01-02" end="2026-01-06" />
          </GanttRow>
        </GanttRoot>
      `,
    })
    await nextTick()

    // Two rows in the sidebar, three task bars total.
    expect(wrapper.findAll('.gantt-task-list__row')).toHaveLength(2)
    expect(wrapper.text()).toContain('Xeno')
    expect(wrapper.text()).toContain('Yotta')
    expect(wrapper.findAll('.gantt-bar')).toHaveLength(3)
  })
})
