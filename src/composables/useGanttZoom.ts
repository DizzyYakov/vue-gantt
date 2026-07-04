import { computed, ref, watch, type ComputedRef } from 'vue'
import type { GanttUnit, GanttZoomEvent, GanttZoomLevel } from '../types'

// Coarse → fine ranking, used to order tier rows and pick base/coarsest tiers.
const TIER_RANK: Record<GanttUnit, number> = {
  year: 0,
  quarter: 1,
  month: 2,
  week: 3,
  day: 4,
  hour: 5,
  minute: 6,
}

export interface ZoomOptions {
  /** Preset bundles of `tiers` + `columnWidth` (the `zoomLevels` prop). */
  zoomLevels: () => GanttZoomLevel[]
  /** The `zoom` prop / `v-model:zoom` (active level id, or `undefined`). */
  zoom: () => string | undefined
  /** The raw `tiers` prop (falls back to `[unit]` when empty/absent). */
  tiers: () => GanttUnit[] | undefined
  /** The `unit` prop (base tier when neither zoom nor `tiers` apply). */
  unit: () => GanttUnit
  /** The raw `columnWidth` prop (used when no zoom level is active). */
  columnWidth: () => number
  /** `v-model:zoom` update — the active level id changed. */
  onUpdateZoom: (id: string) => void
  /** `zoom-change` event — the active level changed. */
  onZoomChange: (event: GanttZoomEvent) => void
}

export interface GanttZoomApi {
  /** Displayed time-group rows, deduped and ordered coarse → fine. */
  tiers: ComputedRef<GanttUnit[]>
  /** Effective pixel density (zoom level's width wins over the prop). */
  columnWidth: ComputedRef<number>
  /** Finest displayed tier — drives pixel density. */
  baseUnit: ComputedRef<GanttUnit>
  /** Coarsest displayed tier — snaps the auto date bounds. */
  coarsestUnit: ComputedRef<GanttUnit>
  zoomLevels: ComputedRef<GanttZoomLevel[]>
  activeZoom: ComputedRef<string | undefined>
  canZoomIn: ComputedRef<boolean>
  canZoomOut: ComputedRef<boolean>
  setZoom: (id: string) => void
  zoomIn: () => void
  zoomOut: () => void
}

/**
 * Zoom / view-mode state for the chart. A zoom level is a preset bundle of
 * `tiers` + `columnWidth`. State is uncontrolled-with-v-model: an internal ref
 * seeded from the `zoom` prop and kept in sync with it, so `setZoom`/`zoomIn`/
 * `zoomOut` work standalone while `v-model:zoom` (or a static `:zoom`) still
 * drives it. When no level is active the chart falls back to the raw
 * `tiers`/`columnWidth`/`unit` props. Also derives the displayed `tiers` and the
 * base/coarsest units the rest of the chart's geometry hangs off.
 */
export function useGanttZoom(options: ZoomOptions): GanttZoomApi {
  const zoomLevels = computed<GanttZoomLevel[]>(() => options.zoomLevels())
  const zoomState = ref<string | undefined>(options.zoom())
  watch(options.zoom, zoomId => {
    if (zoomId != null) zoomState.value = zoomId
  })
  const activeZoom = computed<string | undefined>(() => zoomState.value)
  const activeIndex = computed<number>(() =>
    zoomLevels.value.findIndex(level => level.id === activeZoom.value),
  )
  const activeLevel = computed<GanttZoomLevel | undefined>(() => zoomLevels.value[activeIndex.value])

  // Displayed time-group rows, deduped and ordered coarse → fine. The active zoom
  // level's tiers win; otherwise the `tiers` prop (or `[unit]`).
  const tiers = computed<GanttUnit[]>(() => {
    const rawTiers = options.tiers()
    const requested = activeLevel.value?.tiers ?? (rawTiers?.length ? rawTiers : [options.unit()])
    return [...new Set(requested)].sort((a, b) => TIER_RANK[a] - TIER_RANK[b])
  })

  // Pixel density: the active zoom level's columnWidth wins over the prop.
  const columnWidth = computed<number>(() => activeLevel.value?.columnWidth ?? options.columnWidth())

  // The finest displayed tier drives pixel density; the coarsest snaps the bounds.
  const baseUnit = computed<GanttUnit>(() => tiers.value[tiers.value.length - 1] ?? options.unit())
  const coarsestUnit = computed<GanttUnit>(() => tiers.value[0] ?? options.unit())

  // The index `zoomIn`/`zoomOut` step from: the active level, or — when none is
  // active — the level whose base unit matches the current axis, else the coarsest.
  // `canZoomIn`/`canZoomOut` read from the same anchor, so a button's disabled
  // state always matches whether a click would move.
  const effectiveIndex = computed<number>(() => {
    if (activeIndex.value >= 0) return activeIndex.value
    const byUnit = zoomLevels.value.findIndex(
      level => level.tiers[level.tiers.length - 1] === baseUnit.value,
    )
    return byUnit < 0 ? 0 : byUnit
  })
  const canZoomIn = computed(() => effectiveIndex.value < zoomLevels.value.length - 1)
  const canZoomOut = computed(() => effectiveIndex.value > 0)

  function setZoom(id: string): void {
    // Idempotent: re-selecting the active level (e.g. a clamped edge step) is a
    // no-op and emits nothing.
    if (id === zoomState.value) return
    const level = zoomLevels.value.find(candidate => candidate.id === id)
    if (!level) return
    zoomState.value = id
    options.onUpdateZoom(id)
    options.onZoomChange({ id, level })
  }

  // Step `delta` levels (coarse→fine ordering: +1 = finer), clamped to the range.
  function step(delta: number): void {
    const levels = zoomLevels.value
    const next = Math.min(levels.length - 1, Math.max(0, effectiveIndex.value + delta))
    const target = levels[next]
    if (target) setZoom(target.id)
  }
  const zoomIn = (): void => step(1)
  const zoomOut = (): void => step(-1)

  return {
    tiers,
    columnWidth,
    baseUnit,
    coarsestUnit,
    zoomLevels,
    activeZoom,
    canZoomIn,
    canZoomOut,
    setZoom,
    zoomIn,
    zoomOut,
  }
}
