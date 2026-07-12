import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import { nextTick } from 'vue'
import Gantt from '../Gantt.vue'
import GanttRoot from '../GanttRoot.vue'
import GanttRow from '../GanttRow.vue'
import GanttSummaryBar from '../GanttSummaryBar.vue'
import GanttTask from '../GanttTask.vue'
import GanttTaskList from '../GanttTaskList.vue'
import type { GanttRowData } from '../../index'
import { mountInRoot } from '../../__tests__/helpers'

// A parent with two children, in pre-order.
const rows: GanttRowData[] = [
  { id: 'p', name: 'Parent', tasks: [{ id: 'pt', start: '2026-06-10', end: '2026-06-12' }] },
  { id: 'c1', name: 'Child 1', parentId: 'p', tasks: [{ id: 'c1t', start: '2026-06-01', end: '2026-06-05', progress: 100 }] },
  { id: 'c2', name: 'Child 2', parentId: 'p', tasks: [{ id: 'c2t', start: '2026-06-06', end: '2026-06-08' }] },
]

describe('row tree (WBS) — sidebar', () => {
  it('marks parents with a chevron and indents children by depth', () => {
    const wrapper = mount(Gantt, { props: { rows, unit: 'day' } })
    const parent = wrapper.find('.gantt-task-list__row[data-id="p"]')
    expect(parent.attributes('data-has-children')).toBe('true')
    expect(parent.find('.gantt-task-list__row-toggle').exists()).toBe(true)

    const child = wrapper.find('.gantt-task-list__row[data-id="c1"]')
    expect(child.attributes('data-depth')).toBe('1')
    expect(child.attributes('style')).toContain('var(--gantt-row-indent, 16px) * 1')
    // A leaf child has no toggle chevron.
    expect(child.find('.gantt-task-list__row-toggle').exists()).toBe(false)
  })

  it('exposes a scoped row slot with depth/collapsed/hasChildren/toggle', () => {
    const wrapper = mount(Gantt, {
      props: { rows, unit: 'day' },
      slots: {
        row: (p: { depth: number; hasChildren: boolean }) => `d${p.depth}:${p.hasChildren}`,
      },
    })
    // Rows are matched by their `data-id`; the slot renders depth + hasChildren.
    expect(wrapper.find('.gantt-task-list__row[data-id="p"]').text()).toBe('d0:true')
    expect(wrapper.find('.gantt-task-list__row[data-id="c1"]').text()).toBe('d1:false')
  })
})

describe('row tree (WBS) — collapse / expand', () => {
  it('collapsing a parent hides its subtree + bars and emits row-toggle', async () => {
    const wrapper = mount(Gantt, { props: { rows, unit: 'day' } })
    expect(wrapper.findAll('.gantt-task-list__row')).toHaveLength(3)

    await wrapper.find('.gantt-task-list__row[data-id="p"] .gantt-task-list__row-toggle').trigger('click')

    // Only the parent row remains; child bars disappear (parent's own bar stays).
    expect(wrapper.findAll('.gantt-task-list__row').map(r => r.attributes('data-id'))).toEqual(['p'])
    expect(wrapper.findAll('.gantt-bar').map(b => b.attributes('data-id'))).toEqual(['pt'])
    expect(wrapper.find('.gantt-task-list__row[data-id="p"]').attributes('data-collapsed')).toBe('true')
    expect(wrapper.emitted('row-toggle')![0]![0]).toEqual({ id: 'p', collapsed: true })

    // Expanding restores the subtree.
    await wrapper.find('.gantt-task-list__row[data-id="p"] .gantt-task-list__row-toggle').trigger('click')
    expect(wrapper.findAll('.gantt-task-list__row')).toHaveLength(3)
    expect(wrapper.emitted('row-toggle')![1]![0]).toEqual({ id: 'p', collapsed: false })
  })

  it('honours an initial collapsed row', () => {
    const wrapper = mount(Gantt, {
      props: {
        rows: [{ ...rows[0]!, collapsed: true }, rows[1]!, rows[2]!],
        unit: 'day',
      },
    })
    expect(wrapper.findAll('.gantt-task-list__row').map(r => r.attributes('data-id'))).toEqual(['p'])
  })
})

describe('row tree (WBS) — summary bar', () => {
  it('draws a rollup bar per parent spanning its subtree extent', () => {
    const { wrapper, ctx } = mountInRoot(GanttSummaryBar, {
      rootProps: { rows, unit: 'day', columnWidth: 40 },
    })
    const parent = ctx().rows.value.find(r => r.id === 'p')!
    // Subtree spans c1t(Jun1) .. pt(Jun12).
    expect(parent.rollup!.start).toEqual(new Date(2026, 5, 1))
    expect(parent.rollup!.end).toEqual(new Date(2026, 5, 12))
    const bar = wrapper.find('.gantt-summary-bar[data-id="p"]')
    expect(bar.exists()).toBe(true)
    // Only parents get a summary bar (leaves don't).
    expect(wrapper.findAll('.gantt-summary-bar').map(b => b.attributes('data-id'))).toEqual(['p'])
  })

  it('forwards a custom summaryBar slot through the <Gantt> wrapper', () => {
    const wrapper = mount(Gantt, {
      props: { rows, unit: 'day' },
      slots: { summaryBar: () => 'custom-summary' },
    })
    // The custom slot replaces the default rollup track on the parent's bar.
    const bar = wrapper.find('.gantt-summary-bar[data-id="p"]')
    expect(bar.exists()).toBe(true)
    expect(bar.text()).toBe('custom-summary')
    expect(bar.find('.gantt-summary-bar__track').exists()).toBe(false)
  })

  it('keeps the order == index contract for tasks of nested rows', () => {
    const { ctx } = mountInRoot(GanttTaskList, { rootProps: { rows, unit: 'day' } })
    for (const task of ctx().tasks.value) {
      expect(ctx().rows.value[task.order]!.id).toBe(task.rowId)
    }
  })
})

describe('row tree (WBS) — summary style (bracket vs bar)', () => {
  it('draws a bracket line for an expanded parent by default (no track/progress)', () => {
    const { wrapper, ctx } = mountInRoot(GanttSummaryBar, {
      rootProps: { rows, unit: 'day', columnWidth: 40 },
    })
    const bar = wrapper.find('.gantt-summary-bar[data-id="p"]')
    expect(bar.attributes('data-collapsed')).toBeUndefined()
    expect(bar.find('.gantt-summary-bar__bracket').exists()).toBe(true)
    expect(bar.find('.gantt-summary-bar__track').exists()).toBe(false)
    expect(bar.find('.gantt-summary-bar__progress').exists()).toBe(false)

    // Bracket geometry matches the scale, same as the track would.
    const parent = ctx().rows.value.find(r => r.id === 'p')!
    const bracket = bar.find('.gantt-summary-bar__bracket')
    expect(bracket.attributes('style')).toContain(`left: ${ctx().dateToX(parent.rollup!.start)}px`)
    expect(bracket.attributes('style')).toContain(
      `width: ${ctx().widthBetween(parent.rollup!.start, parent.rollup!.end)}px`,
    )
  })

  it('draws a filled track + progress (no bracket) for a collapsed parent by default', () => {
    const collapsedRows = [{ ...rows[0]!, collapsed: true }, rows[1]!, rows[2]!]
    const { wrapper } = mountInRoot(GanttSummaryBar, { rootProps: { rows: collapsedRows, unit: 'day' } })
    const bar = wrapper.find('.gantt-summary-bar[data-id="p"]')
    expect(bar.attributes('data-collapsed')).toBe('true')
    expect(bar.find('.gantt-summary-bar__track').exists()).toBe(true)
    expect(bar.find('.gantt-summary-bar__progress').exists()).toBe(true)
    expect(bar.find('.gantt-summary-bar__bracket').exists()).toBe(false)
  })

  it('always draws a filled track for summaryStyle="bar", expanded or collapsed', () => {
    const { wrapper: expanded } = mountInRoot(GanttSummaryBar, {
      rootProps: { rows, unit: 'day', summaryStyle: 'bar' },
    })
    const expandedBar = expanded.find('.gantt-summary-bar[data-id="p"]')
    expect(expandedBar.find('.gantt-summary-bar__track').exists()).toBe(true)
    expect(expandedBar.find('.gantt-summary-bar__progress').exists()).toBe(true)
    expect(expandedBar.find('.gantt-summary-bar__bracket').exists()).toBe(false)

    const collapsedRows = [{ ...rows[0]!, collapsed: true }, rows[1]!, rows[2]!]
    const { wrapper: collapsed } = mountInRoot(GanttSummaryBar, {
      rootProps: { rows: collapsedRows, unit: 'day', summaryStyle: 'bar' },
    })
    const collapsedBar = collapsed.find('.gantt-summary-bar[data-id="p"]')
    expect(collapsedBar.find('.gantt-summary-bar__track').exists()).toBe(true)
    expect(collapsedBar.find('.gantt-summary-bar__progress').exists()).toBe(true)
    expect(collapsedBar.find('.gantt-summary-bar__bracket').exists()).toBe(false)
  })
})

describe('row tree (WBS) — declarative nesting', () => {
  it('nested <GanttRow> inherit the parent id and depth', async () => {
    const wrapper = mount({
      components: { GanttRoot, GanttTaskList, GanttRow, GanttTask },
      template: `
        <GanttRoot unit="day">
          <GanttTaskList />
          <GanttRow id="p" name="Parent">
            <GanttTask id="pt" start="2026-06-10" end="2026-06-12" />
            <GanttRow id="c1" name="Child">
              <GanttTask id="c1t" start="2026-06-01" end="2026-06-05" />
            </GanttRow>
          </GanttRow>
        </GanttRoot>
      `,
    })
    await nextTick()
    const parent = wrapper.find('.gantt-task-list__row[data-id="p"]')
    expect(parent.attributes('data-has-children')).toBe('true')
    expect(parent.find('.gantt-task-list__row-toggle').exists()).toBe(true)
    expect(wrapper.find('.gantt-task-list__row[data-id="c1"]').attributes('data-depth')).toBe('1')
  })

  it('supports 3+ levels of nesting and keeps pre-order across a subtree + its following sibling', async () => {
    // p → c1 → g1 (grandchild), plus c2 as p's second child declared after c1's
    // whole subtree — registration order (Vue mounts depth-first) must come out
    // as pre-order: p, c1, g1, c2.
    const wrapper = mount({
      components: { GanttRoot, GanttTaskList, GanttRow, GanttTask },
      template: `
        <GanttRoot unit="day">
          <GanttTaskList />
          <GanttRow id="p" name="Parent">
            <GanttTask id="pt" start="2026-06-10" end="2026-06-12" />
            <GanttRow id="c1" name="Child 1">
              <GanttTask id="c1t" start="2026-06-01" end="2026-06-02" />
              <GanttRow id="g1" name="Grandchild">
                <GanttTask id="g1t" start="2026-06-03" end="2026-06-04" />
              </GanttRow>
            </GanttRow>
            <GanttRow id="c2" name="Child 2">
              <GanttTask id="c2t" start="2026-06-06" end="2026-06-08" />
            </GanttRow>
          </GanttRow>
        </GanttRoot>
      `,
    })
    await nextTick()
    expect(wrapper.findAll('.gantt-task-list__row').map(r => r.attributes('data-id'))).toEqual([
      'p',
      'c1',
      'g1',
      'c2',
    ])
    expect(wrapper.find('.gantt-task-list__row[data-id="p"]').attributes('data-depth')).toBeUndefined()
    expect(wrapper.find('.gantt-task-list__row[data-id="c1"]').attributes('data-depth')).toBe('1')
    expect(wrapper.find('.gantt-task-list__row[data-id="g1"]').attributes('data-depth')).toBe('2')
    // c2 resumes at depth 1, back under p, after g1's deeper subtree.
    expect(wrapper.find('.gantt-task-list__row[data-id="c2"]').attributes('data-depth')).toBe('1')
    expect(wrapper.find('.gantt-task-list__row[data-id="g1"]').attributes('data-has-children')).toBeUndefined()
  })
})

describe('row tree (WBS) — regression: rows without parentId keep the group layout unchanged', () => {
  it('resolves no tree metadata and renders no summary bar for a groupId-only dataset', () => {
    const groupedRows: GanttRowData[] = [
      { id: 'r1', groupId: 'be', tasks: [{ id: 'a', start: '2026-06-01', end: '2026-06-05' }] },
      { id: 'r2', groupId: 'be', tasks: [{ id: 'b', start: '2026-06-03', end: '2026-06-09' }] },
    ]
    const { wrapper, ctx } = mountInRoot(GanttSummaryBar, {
      rootProps: { rows: groupedRows, groups: [{ id: 'be', name: 'Backend' }], unit: 'day' },
    })
    for (const row of ctx().rows.value) {
      expect(row.hasChildren).toBe(false)
      expect(row.depth).toBe(0)
      expect(row.rollup).toBeUndefined()
    }
    // No tree, so the (tree-only) summary bar never draws — the group path uses
    // `GanttGroupBar` instead (covered in grouping.spec.ts).
    expect(wrapper.findAll('.gantt-summary-bar')).toHaveLength(0)
  })
})
