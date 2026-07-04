import { describe, expect, it } from 'vitest'
import { ceilToUnit, floorToUnit } from '../dateUnits'
import type { GanttUnit } from '../types'

// A date deliberately not aligned to any unit boundary, so every case actually
// exercises the snapping (not a coincidental no-op).
const mid = new Date(2026, 4, 15, 13, 42, 30, 500) // 2026-05-15 13:42:30.500 (Fri, Q2)

describe('floorToUnit', () => {
  it.each<[GanttUnit, Date]>([
    ['year', new Date(2026, 0, 1, 0, 0, 0, 0)],
    ['quarter', new Date(2026, 3, 1, 0, 0, 0, 0)],
    ['month', new Date(2026, 4, 1, 0, 0, 0, 0)],
    ['week', new Date(2026, 4, 10, 0, 0, 0, 0)],
    ['day', new Date(2026, 4, 15, 0, 0, 0, 0)],
    ['hour', new Date(2026, 4, 15, 13, 0, 0, 0)],
    ['minute', new Date(2026, 4, 15, 13, 42, 0, 0)],
  ])('snaps down to the start of %s', (unit, expected) => {
    expect(floorToUnit(mid, unit).getTime()).toBe(expected.getTime())
  })

  it('falls back to day for an unrecognized unit', () => {
    const result = floorToUnit(mid, 'not-a-unit' as GanttUnit)
    expect(result.getTime()).toBe(new Date(2026, 4, 15, 0, 0, 0, 0).getTime())
  })
})

describe('ceilToUnit', () => {
  it.each<[GanttUnit, Date]>([
    ['year', new Date(2026, 11, 31, 23, 59, 59, 999)],
    ['quarter', new Date(2026, 5, 30, 23, 59, 59, 999)],
    ['month', new Date(2026, 4, 31, 23, 59, 59, 999)],
    ['week', new Date(2026, 4, 16, 23, 59, 59, 999)],
    ['day', new Date(2026, 4, 15, 23, 59, 59, 999)],
    ['hour', new Date(2026, 4, 15, 13, 59, 59, 999)],
    ['minute', new Date(2026, 4, 15, 13, 42, 59, 999)],
  ])('snaps up to the end of %s', (unit, expected) => {
    expect(ceilToUnit(mid, unit).getTime()).toBe(expected.getTime())
  })

  it('falls back to day for an unrecognized unit', () => {
    const result = ceilToUnit(mid, 'not-a-unit' as GanttUnit)
    expect(result.getTime()).toBe(new Date(2026, 4, 15, 23, 59, 59, 999).getTime())
  })
})
