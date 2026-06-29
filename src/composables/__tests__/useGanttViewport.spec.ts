import { mount } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { defineComponent, h, nextTick, ref, useTemplateRef } from 'vue'
import GanttRoot from '../../components/GanttRoot.vue'
import { useGanttViewport } from '../useGanttViewport'
import { useGanttContext } from '../useGanttContext'
import type { GanttContext } from '../../types'

/** Give a jsdom element measurable scroll/size metrics. */
function size(
  el: HTMLElement,
  m: Partial<Record<'clientWidth' | 'clientHeight' | 'scrollLeft' | 'scrollTop', number>>,
): void {
  for (const [k, v] of Object.entries(m)) {
    Object.defineProperty(el, k, { configurable: true, value: v })
  }
}

describe('useGanttViewport', () => {
  beforeEach(() => {
    // Run rAF callbacks synchronously so the coalesced scroll update is testable.
    vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => {
      cb(0)
      return 1
    })
    vi.stubGlobal('cancelAnimationFrame', () => {})
  })
  afterEach(() => vi.unstubAllGlobals())

  function mountWiredView() {
    let ctx!: GanttContext
    const Harness = defineComponent({
      setup() {
        ctx = useGanttContext()
        const scroller = useTemplateRef<HTMLElement>('scroller')
        useGanttViewport(scroller)
        return () => h('div', { ref: 'scroller', class: 'scroller' })
      },
    })
    const wrapper = mount(GanttRoot, {
      props: { rows: [{ id: 'r', tasks: [{ id: 'a', start: '2026-01-01', end: '2026-03-31' }] }] },
      slots: { default: () => h(Harness) },
    })
    const el = wrapper.find('.scroller').element as HTMLElement
    return { wrapper, ctx: () => ctx, el: () => el }
  }

  it('reports the element metrics into the context on mount', async () => {
    const { ctx, el } = mountWiredView()
    size(el(), { clientWidth: 800, clientHeight: 400, scrollLeft: 0, scrollTop: 0 })
    // Re-measure by firing a scroll (mount already measured 0s).
    el().dispatchEvent(new Event('scroll'))
    await nextTick()
    expect(ctx().viewport.width).toBe(800)
    expect(ctx().viewport.height).toBe(400)
  })

  it('updates scroll position on scroll events', async () => {
    const { ctx, el } = mountWiredView()
    size(el(), { clientWidth: 500, clientHeight: 300, scrollLeft: 120, scrollTop: 60 })
    el().dispatchEvent(new Event('scroll'))
    await nextTick()
    expect(ctx().viewport.scrollLeft).toBe(120)
    expect(ctx().viewport.scrollTop).toBe(60)
  })

  it('stops reporting after the element is detached on unmount', async () => {
    const { wrapper, ctx, el } = mountWiredView()
    const node = el()
    wrapper.unmount()
    // A scroll after unmount must not push new metrics.
    size(node, { clientWidth: 999, clientHeight: 999, scrollLeft: 999, scrollTop: 999 })
    node.dispatchEvent(new Event('scroll'))
    await nextTick()
    expect(ctx().viewport.width).not.toBe(999)
  })

  it('no-ops gracefully when the target is null', () => {
    expect(() =>
      mount(GanttRoot, {
        props: { rows: [{ id: 'r', tasks: [] }] },
        slots: {
          default: () =>
            h(
              defineComponent({
                setup() {
                  useGanttViewport(ref(null))
                  return () => null
                },
              }),
            ),
        },
      }),
    ).not.toThrow()
  })
})
