import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  AUTOSCROLL_EDGE,
  AUTOSCROLL_MAX_SPEED,
  edgeVelocity,
  useGanttAutoscroll,
} from '../useGanttAutoscroll'

// A 1000×500 viewport at the page origin.
const rect = { left: 0, top: 0, right: 1000, bottom: 500 }
const E = AUTOSCROLL_EDGE
const M = AUTOSCROLL_MAX_SPEED

describe('edgeVelocity', () => {
  it('is zero in the middle (far from every edge)', () => {
    expect(edgeVelocity(rect, { x: 500, y: 250 })).toEqual({ vx: 0, vy: 0 })
  })

  it('pulls left/up near the start edges, right/down near the end edges', () => {
    expect(edgeVelocity(rect, { x: 4, y: 250 }).vx).toBeLessThan(0)
    expect(edgeVelocity(rect, { x: 996, y: 250 }).vx).toBeGreaterThan(0)
    expect(edgeVelocity(rect, { x: 500, y: 4 }).vy).toBeLessThan(0)
    expect(edgeVelocity(rect, { x: 500, y: 496 }).vy).toBeGreaterThan(0)
  })

  it('accelerates toward the edge (faster the closer the pointer)', () => {
    const near = edgeVelocity(rect, { x: rect.right - 4, y: 250 }).vx
    const far = edgeVelocity(rect, { x: rect.right - (E - 4), y: 250 }).vx
    expect(near).toBeGreaterThan(far)
    expect(far).toBeGreaterThan(0)
  })

  it('caps at the max speed at (or past) the edge', () => {
    expect(edgeVelocity(rect, { x: rect.right, y: 250 }).vx).toBe(M)
    // Pointer dragged outside the viewport still clamps to max.
    expect(edgeVelocity(rect, { x: rect.right + 200, y: 250 }).vx).toBe(M)
    expect(edgeVelocity(rect, { x: -200, y: 250 }).vx).toBe(-M)
  })

  it('no horizontal pull just outside the edge zone', () => {
    expect(edgeVelocity(rect, { x: E + 1, y: 250 }).vx).toBe(0)
    expect(edgeVelocity(rect, { x: rect.right - E - 1, y: 250 }).vx).toBe(0)
  })

  it('combines both axes in a corner', () => {
    const v = edgeVelocity(rect, { x: rect.right - 2, y: rect.bottom - 2 })
    expect(v.vx).toBeGreaterThan(0)
    expect(v.vy).toBeGreaterThan(0)
  })
})

describe('useGanttAutoscroll clamping', () => {
  afterEach(() => vi.restoreAllMocks())

  it('clamps to getMaxScroll, not the (ghost-inflated) scrollWidth', () => {
    // Drive rAF synchronously for a bounded number of frames.
    let cb: ((time: number) => void) | null = null
    vi.spyOn(globalThis, 'requestAnimationFrame').mockImplementation((fn: FrameRequestCallback) => {
      cb = fn
      return 1
    })
    vi.spyOn(globalThis, 'cancelAnimationFrame').mockImplementation(() => {})

    // A dragged ghost overflowed the body → scrollWidth is huge. The engine must
    // still stop at the content-derived max, not chase scrollWidth forever.
    const el = {
      scrollLeft: 0,
      scrollTop: 0,
      scrollWidth: 1_000_000,
      scrollHeight: 100,
      clientWidth: 200,
      clientHeight: 100,
      getBoundingClientRect: () => ({ left: 0, top: 0, right: 200, bottom: 100, width: 200, height: 100 }),
    } as unknown as HTMLElement

    const MAX_X = 150
    const { update } = useGanttAutoscroll(
      () => el,
      () => ({ x: MAX_X, y: 0 }),
    )
    update({ x: 198, y: 50 }) // parked at the right edge
    // `cb` is reassigned inside the rAF mock (a closure TS can't flow-track), so
    // cast past its narrowed type to call the captured frame callback.
    for (let i = 0; i < 100; i++) {
      const fn = cb as ((time: number) => void) | null
      if (fn) fn(0)
    }
    update(null)

    expect(el.scrollLeft).toBe(MAX_X)
  })
})
