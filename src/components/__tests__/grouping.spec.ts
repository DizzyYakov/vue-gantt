import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import { h, nextTick } from 'vue'
import Gantt from '../Gantt.vue'
import GanttRoot from '../GanttRoot.vue'
import GanttGroup from '../GanttGroup.vue'
import GanttRow from '../GanttRow.vue'
import GanttTask from '../GanttTask.vue'
import GanttTaskList from '../GanttTaskList.vue'
import GanttGroupBar from '../GanttGroupBar.vue'
import type { GanttGroupData, GanttRowData, ResolvedGroup } from '../../index'
import { mountInRoot } from '../../__tests__/helpers'

const rows: GanttRowData[] = [
  {
    id: 'r1',
    name: 'API',
    groupId: 'be',
    tasks: [{ id: 'a', start: '2026-06-01', end: '2026-06-05', progress: 50 }],
  },
  {
    id: 'r2',
    name: 'DB',
    groupId: 'be',
    tasks: [{ id: 'b', start: '2026-06-03', end: '2026-06-09' }],
  },
  {
    id: 'r3',
    name: 'UI',
    groupId: 'fe',
    tasks: [{ id: 'c', start: '2026-06-02', end: '2026-06-08' }],
  },
]
const groups: GanttGroupData[] = [
  { id: 'be', name: 'Backend' },
  { id: 'fe', name: 'Frontend' },
]

describe('row grouping — sidebar headers', () => {
  it('renders a collapsible header per group with its name', () => {
    const wrapper = mount(Gantt, { props: { rows, groups, unit: 'day' } })
    const headers = wrapper.findAll('.gantt-task-list__group')
    expect(headers.map(h => h.attributes('data-id'))).toEqual(['be', 'fe'])
    expect(headers[0]!.text()).toContain('Backend')
    expect(headers[1]!.text()).toContain('Frontend')
    // All three member rows + their bars are visible while expanded.
    expect(wrapper.findAll('.gantt-task-list__row')).toHaveLength(3)
    expect(wrapper.findAll('.gantt-bar')).toHaveLength(3)
  })

  it('falls back to the group id when no name is given and none in groups prop', () => {
    const wrapper = mount(Gantt, {
      props: { rows: [{ id: 'r', groupId: 'solo', tasks: [] }], unit: 'day' },
    })
    expect(wrapper.find('.gantt-task-list__group[data-id="solo"]').text()).toContain('solo')
  })

  it('indents member rows under their group', () => {
    const wrapper = mount(Gantt, { props: { rows, groups, unit: 'day' } })
    expect(wrapper.find('.gantt-task-list__row[data-id="r1"]').attributes('data-group')).toBe('be')
  })

  it('exposes a scoped group slot with group/collapsed/toggle', () => {
    const wrapper = mount(Gantt, {
      props: { rows, groups, unit: 'day' },
      slots: {
        group: (p: { group: unknown; collapsed: boolean }) =>
          h('span', { class: 'cg' }, `${(p.group as ResolvedGroup).name}:${p.collapsed}`),
      },
    })
    expect(wrapper.find('.cg').text()).toBe('Backend:false')
    // The default toggle button is replaced by the custom slot.
    expect(wrapper.find('.gantt-task-list__group-toggle').exists()).toBe(false)
  })
})

describe('row grouping — collapse / expand', () => {
  it('collapsing a group hides its member rows and bars, and emits group-toggle', async () => {
    const wrapper = mount(Gantt, { props: { rows, groups, unit: 'day' } })
    await wrapper
      .find('.gantt-task-list__group[data-id="be"] .gantt-task-list__group-toggle')
      .trigger('click')

    // r1/r2 rows + bars a/b disappear; only the fe row + bar c remain.
    expect(wrapper.findAll('.gantt-task-list__row').map(r => r.attributes('data-id'))).toEqual([
      'r3',
    ])
    expect(wrapper.findAll('.gantt-bar')).toHaveLength(1)
    expect(wrapper.find('.gantt-bar[data-id="c"]').exists()).toBe(true)

    // Header stays; event is emitted with the new state.
    expect(wrapper.find('.gantt-task-list__group[data-id="be"]').exists()).toBe(true)
    expect(wrapper.emitted('group-toggle')![0]![0]).toEqual({ id: 'be', collapsed: true })

    // Expanding restores everything.
    await wrapper
      .find('.gantt-task-list__group[data-id="be"] .gantt-task-list__group-toggle')
      .trigger('click')
    expect(wrapper.findAll('.gantt-bar')).toHaveLength(3)
    expect(wrapper.emitted('group-toggle')![1]![0]).toEqual({ id: 'be', collapsed: false })
  })

  it('honours an initial collapsed group', () => {
    const wrapper = mount(Gantt, {
      props: {
        rows,
        groups: [{ id: 'be', name: 'Backend', collapsed: true }, { id: 'fe' }],
        unit: 'day',
      },
    })
    expect(wrapper.find('.gantt-task-list__group[data-id="be"]').attributes('data-collapsed')).toBe(
      'true',
    )
    expect(wrapper.findAll('.gantt-bar').map(b => b.attributes('data-id'))).toEqual(['c'])
  })

  it('grows contentHeight by the group header bands', () => {
    const { ctx: grouped } = mountInRoot(GanttTaskList, {
      rootProps: { rows, groups, unit: 'day', rowHeight: 30, groupHeaderHeight: 20 },
    })
    const { ctx: flat } = mountInRoot(GanttTaskList, {
      rootProps: {
        rows: rows.map(r => ({ ...r, groupId: undefined })),
        unit: 'day',
        rowHeight: 30,
        groupHeaderHeight: 20,
      },
    })
    // Two group headers add 2 × 20px over the ungrouped layout.
    expect(grouped().contentHeight.value).toBe(flat().contentHeight.value + 40)
  })
})

describe('row grouping — summary bar', () => {
  it('draws one rollup bar per group spanning its task extent', () => {
    const { wrapper, ctx } = mountInRoot(GanttGroupBar, {
      rootProps: { rows, groups, unit: 'day', columnWidth: 40 },
    })
    const bars = wrapper.findAll('.gantt-group-bar')
    expect(bars.map(b => b.attributes('data-id'))).toEqual(['be', 'fe'])

    // Backend spans a(Jun1-5) + b(Jun3-9) → Jun1..Jun9.
    const be = ctx().groups.value.find(g => g.id === 'be')!
    const track = wrapper.find('.gantt-group-bar[data-id="be"] .gantt-group-bar__track')
    expect(track.attributes('style')).toContain(`left: ${ctx().dateToX(be.start)}px`)
    expect(track.attributes('style')).toContain(`width: ${ctx().widthBetween(be.start, be.end)}px`)
  })

  it('keeps showing a collapsed group summary bar', () => {
    const wrapper = mount(Gantt, {
      props: { rows, groups: [{ id: 'be', collapsed: true }, { id: 'fe' }], unit: 'day' },
    })
    expect(wrapper.find('.gantt-group-bar[data-id="be"]').exists()).toBe(true)
  })

  it('skips a group with no tasks', () => {
    const { wrapper } = mountInRoot(GanttGroupBar, {
      rootProps: {
        rows: [{ id: 'r', groupId: 'empty', tasks: [] }],
        groups: [{ id: 'empty', name: 'Empty' }],
        unit: 'day',
      },
    })
    expect(wrapper.findAll('.gantt-group-bar')).toHaveLength(0)
  })

  it('exposes a scoped slot carrying the group', () => {
    const { wrapper } = mountInRoot(GanttGroupBar, {
      rootProps: { rows, groups, unit: 'day' },
      slots: {
        default: ({ group }: { group: ResolvedGroup }) => h('span', { class: 'gb' }, group.name),
      },
    })
    expect(wrapper.findAll('.gb').map(g => g.text())).toEqual(['Backend', 'Frontend'])
  })
})

describe('row grouping — declarative <GanttGroup>', () => {
  it('registers groups and lets nested rows inherit the group id', async () => {
    const wrapper = mount({
      components: { GanttRoot, GanttTaskList, GanttGroup, GanttRow, GanttTask },
      template: `
        <GanttRoot unit="day">
          <GanttTaskList />
          <GanttGroup id="be" name="Backend">
            <GanttRow id="r1" name="API">
              <GanttTask id="a" start="2026-06-01" end="2026-06-05" />
            </GanttRow>
            <GanttRow id="r2" name="DB">
              <GanttTask id="b" start="2026-06-03" end="2026-06-09" />
            </GanttRow>
          </GanttGroup>
        </GanttRoot>
      `,
    })
    await nextTick()
    const header = wrapper.find('.gantt-task-list__group[data-id="be"]')
    expect(header.exists()).toBe(true)
    expect(header.text()).toContain('Backend')
    expect(wrapper.find('.gantt-task-list__row[data-id="r1"]').attributes('data-group')).toBe('be')
    expect(wrapper.findAll('.gantt-bar')).toHaveLength(2)
  })

  it('does not render a declarative task/milestone inside a collapsed group', async () => {
    const wrapper = mount({
      components: { GanttRoot, GanttGroup, GanttRow, GanttTask },
      template: `
        <GanttRoot unit="day">
          <GanttGroup id="be" name="Backend">
            <GanttRow id="r1"><GanttTask id="a" start="2026-06-01" end="2026-06-05" /></GanttRow>
          </GanttGroup>
          <GanttGroup id="fe" name="Frontend" :collapsed="true">
            <GanttRow id="r2"><GanttTask id="b" start="2026-06-03" end="2026-06-09" /></GanttRow>
          </GanttGroup>
        </GanttRoot>
      `,
    })
    await nextTick()
    // Only the expanded group's bar renders; the collapsed one is omitted.
    expect(wrapper.findAll('.gantt-bar').map(b => b.attributes('data-id'))).toEqual(['a'])
  })

  it('lets an explicit groupId on GanttRow override the enclosing group', async () => {
    const wrapper = mount({
      components: { GanttRoot, GanttTaskList, GanttGroup, GanttRow },
      template: `
        <GanttRoot unit="day">
          <GanttTaskList />
          <GanttGroup id="be">
            <GanttRow id="r1" group-id="other" />
          </GanttGroup>
        </GanttRoot>
      `,
    })
    await nextTick()
    expect(wrapper.find('.gantt-task-list__row[data-id="r1"]').attributes('data-group')).toBe(
      'other',
    )
  })
})
