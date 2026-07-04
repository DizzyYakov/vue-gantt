import { nextTick, ref } from 'vue'
import { describe, expect, it, vi } from 'vitest'
import { useGanttZoom, type ZoomOptions } from '../useGanttZoom'
import type { GanttUnit, GanttZoomLevel } from '../../types'

// `useGanttZoom` is a pure composable (no Vue context) — drive it directly,
// like `useGanttLink.spec.ts`.

const LEVELS: GanttZoomLevel[] = [
  { id: 'year', tiers: ['year', 'quarter'], columnWidth: 2 },
  { id: 'month', tiers: ['month', 'week'], columnWidth: 5 },
  { id: 'week', tiers: ['week', 'day'], columnWidth: 20 },
  { id: 'day', tiers: ['day'], columnWidth: 40 },
]

function makeZoom(overrides: Partial<ZoomOptions> = {}) {
  const onUpdateZoom = vi.fn<(id: string) => void>()
  const onZoomChange = vi.fn<(event: { id: string; level: GanttZoomLevel }) => void>()
  const zoomRef = ref<string | undefined>(undefined)
  const tiersRef = ref<GanttUnit[] | undefined>(undefined)
  const options: ZoomOptions = {
    zoomLevels: () => LEVELS,
    zoom: () => zoomRef.value,
    tiers: () => tiersRef.value,
    unit: () => 'day',
    columnWidth: () => 30,
    onUpdateZoom,
    onZoomChange,
    ...overrides,
  }
  const api = useGanttZoom(options)
  return { api, onUpdateZoom, onZoomChange, zoomRef, tiersRef }
}

describe('useGanttZoom', () => {
  it('setZoom on a valid level emits update:zoom and zoom-change', () => {
    const { api, onUpdateZoom, onZoomChange } = makeZoom({ zoom: () => 'year' })

    api.setZoom('week')

    expect(api.activeZoom.value).toBe('week')
    expect(onUpdateZoom).toHaveBeenCalledWith('week')
    expect(onZoomChange).toHaveBeenCalledWith({ id: 'week', level: LEVELS[2] })
  })

  it('setZoom on the already-active level is a no-op (emits nothing)', () => {
    const { api, onUpdateZoom, onZoomChange } = makeZoom({ zoom: () => 'week' })

    api.setZoom('week')

    expect(onUpdateZoom).not.toHaveBeenCalled()
    expect(onZoomChange).not.toHaveBeenCalled()
    expect(api.activeZoom.value).toBe('week')
  })

  it('setZoom with an unknown id is a no-op', () => {
    const { api, onUpdateZoom, onZoomChange } = makeZoom({ zoom: () => 'week' })

    api.setZoom('does-not-exist')

    expect(api.activeZoom.value).toBe('week')
    expect(onUpdateZoom).not.toHaveBeenCalled()
    expect(onZoomChange).not.toHaveBeenCalled()
  })

  it('zoomIn/zoomOut step through the sorted levels and clamp at the edges', () => {
    const { api, onUpdateZoom } = makeZoom({ zoom: () => 'month' })

    expect(api.canZoomIn.value).toBe(true)
    expect(api.canZoomOut.value).toBe(true)

    api.zoomIn() // month -> week
    expect(api.activeZoom.value).toBe('week')
    api.zoomIn() // week -> day (finest)
    expect(api.activeZoom.value).toBe('day')
    expect(api.canZoomIn.value).toBe(false)

    onUpdateZoom.mockClear()
    api.zoomIn() // clamped: already at the finest level
    expect(api.activeZoom.value).toBe('day')
    expect(onUpdateZoom).not.toHaveBeenCalled()

    api.zoomOut() // day -> week
    api.zoomOut() // week -> month
    api.zoomOut() // month -> year (coarsest)
    expect(api.activeZoom.value).toBe('year')
    expect(api.canZoomOut.value).toBe(false)

    onUpdateZoom.mockClear()
    api.zoomOut() // clamped: already at the coarsest level
    expect(api.activeZoom.value).toBe('year')
    expect(onUpdateZoom).not.toHaveBeenCalled()
  })

  it('baseUnit is the finest and coarsestUnit the coarsest of the active level tiers', () => {
    const { api } = makeZoom({ zoom: () => 'week' }) // tiers: ['week', 'day']

    expect(api.tiers.value).toEqual(['week', 'day'])
    expect(api.baseUnit.value).toBe('day')
    expect(api.coarsestUnit.value).toBe('week')
  })

  it('falls back to props.tiers (deduped + sorted coarse->fine) when no zoom level is active', () => {
    const { api } = makeZoom({ tiers: () => ['day', 'month', 'day', 'week'] })

    expect(api.activeZoom.value).toBeUndefined()
    expect(api.tiers.value).toEqual(['month', 'week', 'day'])
    expect(api.baseUnit.value).toBe('day')
    expect(api.coarsestUnit.value).toBe('month')
    expect(api.columnWidth.value).toBe(30) // the raw columnWidth prop, unaffected by levels
  })

  it('falls back to [unit] when no zoom level is active and no tiers are given', () => {
    const { api } = makeZoom({ unit: () => 'hour' })

    expect(api.tiers.value).toEqual(['hour'])
    expect(api.baseUnit.value).toBe('hour')
    expect(api.coarsestUnit.value).toBe('hour')
  })

  it('syncs the active level when the `zoom` prop changes externally (v-model)', async () => {
    const { api, zoomRef } = makeZoom()
    expect(api.activeZoom.value).toBeUndefined()

    zoomRef.value = 'month'
    await nextTick()

    expect(api.activeZoom.value).toBe('month')
    expect(api.columnWidth.value).toBe(5)
  })
})
