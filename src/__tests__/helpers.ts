import { mount, type VueWrapper } from '@vue/test-utils'
import { defineComponent, h, type Component } from 'vue'
import GanttRoot from '../components/GanttRoot.vue'
import { useGanttContext } from '../composables/useGanttContext'
import type { GanttContext, GanttRootProps } from '../types'

/**
 * Mount a single Gantt child component inside a real `GanttRoot` so it gets the
 * shared context, and capture that context for assertions. Returns the mounted
 * wrapper plus a `ctx()` accessor.
 */
export function mountInRoot(
  child: Component,
  options: {
    rootProps?: Partial<GanttRootProps>
    props?: Record<string, unknown>
    slots?: Record<string, unknown>
  } = {},
): { wrapper: VueWrapper; ctx: () => GanttContext } {
  let captured: GanttContext | undefined

  const Capture = defineComponent({
    setup() {
      captured = useGanttContext()
      return () => null
    },
  })

  const wrapper = mount(GanttRoot, {
    props: options.rootProps as Record<string, unknown>,
    slots: {
      default: () => [h(Capture), h(child, options.props, options.slots)],
    },
  })

  return { wrapper, ctx: () => captured! }
}
