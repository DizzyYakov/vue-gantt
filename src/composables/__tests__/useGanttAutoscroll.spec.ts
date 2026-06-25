import { describe, expect, it } from 'vitest'
import { AUTOSCROLL_EDGE, AUTOSCROLL_MAX_SPEED, edgeVelocity } from '../useGanttAutoscroll'

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
