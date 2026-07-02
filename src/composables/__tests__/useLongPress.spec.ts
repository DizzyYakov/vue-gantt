import { mount } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { defineComponent, h } from 'vue'
import { useLongPress } from '../useLongPress'

function pe(props: Record<string, unknown>): PointerEvent {
  return Object.assign(new Event('pointerdown'), {
    pointerType: 'touch',
    clientX: 0,
    clientY: 0,
    ...props,
  }) as unknown as PointerEvent
}

/** Mount a trivial host so `useLongPress` gets a component scope (onUnmounted). */
function setup(cb: () => void, opts?: Parameters<typeof useLongPress>[1]) {
  let api: ReturnType<typeof useLongPress> | undefined
  const Host = defineComponent({
    setup() {
      api = useLongPress(cb, opts)
      return () => h('div')
    },
  })
  const wrapper = mount(Host)
  return { wrapper, api: () => api! }
}

describe('useLongPress', () => {
  beforeEach(() => vi.useFakeTimers())
  afterEach(() => vi.useRealTimers())

  it('fires after the delay for a stationary touch press', () => {
    const cb = vi.fn<() => void>()
    const { api } = setup(cb, { delay: 500 })
    api().onPointerdown(pe({}))
    vi.advanceTimersByTime(499)
    expect(cb).not.toHaveBeenCalled()
    vi.advanceTimersByTime(1)
    expect(cb).toHaveBeenCalledTimes(1)
  })

  it('does not arm for a non-touch pointer', () => {
    const cb = vi.fn<() => void>()
    const { api } = setup(cb)
    api().onPointerdown(pe({ pointerType: 'mouse' }))
    vi.advanceTimersByTime(1000)
    expect(cb).not.toHaveBeenCalled()
  })

  it('cancels when the pointer moves past the tolerance', () => {
    const cb = vi.fn<() => void>()
    const { api } = setup(cb, { delay: 500, moveTolerance: 10 })
    api().onPointerdown(pe({}))
    api().onPointermove(pe({ clientX: 20 }))
    vi.advanceTimersByTime(500)
    expect(cb).not.toHaveBeenCalled()
  })

  it('keeps the timer for small jitter within tolerance', () => {
    const cb = vi.fn<() => void>()
    const { api } = setup(cb, { delay: 500, moveTolerance: 10 })
    api().onPointerdown(pe({}))
    api().onPointermove(pe({ clientX: 5 }))
    vi.advanceTimersByTime(500)
    expect(cb).toHaveBeenCalledTimes(1)
  })

  it('cancels on an early release', () => {
    const cb = vi.fn<() => void>()
    const { api } = setup(cb, { delay: 500 })
    api().onPointerdown(pe({}))
    api().onPointerup()
    vi.advanceTimersByTime(500)
    expect(cb).not.toHaveBeenCalled()
  })

  it('cancels on pointercancel', () => {
    const cb = vi.fn<() => void>()
    const { api } = setup(cb, { delay: 500 })
    api().onPointerdown(pe({}))
    api().onPointercancel()
    vi.advanceTimersByTime(500)
    expect(cb).not.toHaveBeenCalled()
  })

  it('clears a pending timer when the host unmounts', () => {
    const cb = vi.fn<() => void>()
    const { wrapper, api } = setup(cb, { delay: 500 })
    api().onPointerdown(pe({}))
    wrapper.unmount()
    vi.advanceTimersByTime(500)
    expect(cb).not.toHaveBeenCalled()
  })
})
