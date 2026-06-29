import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import { nextTick } from 'vue'
import GanttRoot from '../../components/GanttRoot.vue'
import GanttRow from '../../components/GanttRow.vue'
import GanttTask from '../../components/GanttTask.vue'
import { useGanttRegistry } from '../useTaskRegistry'

describe('useGanttRegistry', () => {
  it('preserves row declaration order', () => {
    const reg = useGanttRegistry()
    reg.registerRow({ id: 'b' })
    reg.registerRow({ id: 'a' })
    reg.registerRow({ id: 'c' })
    expect(reg.rows.value.map(r => r.id)).toEqual(['b', 'a', 'c'])
  })

  it('merges child-registered tasks into their row', () => {
    const reg = useGanttRegistry()
    reg.registerRow({ id: 'r', tasks: [{ id: 'pre', start: 0 }] })
    reg.registerTask({ id: 't1', start: 0 }, 'r')
    reg.registerTask({ id: 't2', start: 0 }, 'r')
    const row = reg.rows.value.find(r => r.id === 'r')!
    expect(row.tasks!.map(t => t.id)).toEqual(['pre', 't1', 't2'])
  })

  it('drops a task once unregistered', () => {
    const reg = useGanttRegistry()
    reg.registerRow({ id: 'r' })
    reg.registerTask({ id: 't1', start: 0 }, 'r')
    reg.unregisterTask('t1')
    expect(reg.rows.value.find(r => r.id === 'r')!.tasks).toEqual([])
  })

  it('drops a row once unregistered', () => {
    const reg = useGanttRegistry()
    reg.registerRow({ id: 'r' })
    reg.unregisterRow('r')
    expect(reg.rows.value).toEqual([])
  })

  it('ignores tasks registered against an unknown row', () => {
    const reg = useGanttRegistry()
    reg.registerRow({ id: 'r' })
    reg.registerTask({ id: 'orphan', start: 0 }, 'missing')
    expect(reg.rows.value.find(r => r.id === 'r')!.tasks).toEqual([])
  })
})

describe('declarative registration lifecycle', () => {
  it('unregisters a row and its tasks when removed from the tree', async () => {
    const wrapper = mount({
      components: { GanttRoot, GanttRow, GanttTask },
      data: () => ({ show: true }),
      template: `
        <GanttRoot unit="day">
          <GanttRow v-if="show" id="r" name="Row">
            <GanttTask id="t" start="2026-01-01" end="2026-01-03" />
          </GanttRow>
        </GanttRoot>
      `,
    })
    await nextTick()
    expect(wrapper.findAll('.gantt-bar')).toHaveLength(1)

    await wrapper.setData({ show: false })
    await nextTick()
    expect(wrapper.findAll('.gantt-bar')).toHaveLength(0)
  })
})
