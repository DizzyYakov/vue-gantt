import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import { defineComponent, h } from 'vue'
import GanttRoot from '../../components/GanttRoot.vue'
import { useGanttContext } from '../useGanttContext'

describe('useGanttContext', () => {
  it('throws a helpful error when used outside GanttRoot', () => {
    const Orphan = defineComponent({
      setup() {
        useGanttContext()
        return () => null
      },
    })
    expect(() => mount(Orphan)).toThrow(/must be used inside <GanttRoot>/)
  })

  it('returns the provided context inside GanttRoot', () => {
    let ctx: ReturnType<typeof useGanttContext> | undefined
    const Child = defineComponent({
      setup() {
        ctx = useGanttContext()
        return () => null
      },
    })
    mount(GanttRoot, {
      props: { rows: [{ id: 'r', tasks: [] }] },
      slots: { default: () => h(Child) },
    })
    expect(ctx).toBeDefined()
    expect(typeof ctx!.dateToX).toBe('function')
    expect(ctx!.config.value.unit).toBe('day')
  })
})
