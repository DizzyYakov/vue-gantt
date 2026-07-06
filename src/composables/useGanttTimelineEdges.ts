import { addDays } from 'date-fns'
import { nextTick, watch, type ShallowRef } from 'vue'
import { ceilToUnit, floorToUnit, type WeekBoundaryOptions } from '../dateUnits'
import type { GanttRangeChangeEvent, GanttTimelineMode, GanttUnit, GanttViewport } from '../types'
import type { ApplyScrollFn } from './useGanttScrollApi'

const EXTENSION_FALLBACK_DAYS = 14

export interface TimelineEdgesOptions {
  /** The shared viewport metrics (reactive). */
  viewport: GanttViewport
  sidebarWidth: () => number
  timelineMode: () => GanttTimelineMode
  /** Total scrollable content width in px (`scale.contentWidth`). */
  contentWidth: () => number
  /** Pixels per day (`scale.pxPerDay`) — sizes one growth step. */
  pxPerDay: () => number
  widthBetween: (start: Date, end: Date) => number
  /** Current effective axis start/end. */
  start: () => Date
  end: () => Date
  coarsestUnit: () => GanttUnit
  /** Week-boundary options (locale / `weekStartsOn`) for week-tier range snapping. */
  weekBoundary?: () => WeekBoundaryOptions
  /** Nudge the scroll position (from `useGanttScrollApi`). */
  applyScroll: ApplyScrollFn
  /** `range-change` event — an edge was reached. */
  onRangeChange: (event: GanttRangeChangeEvent) => void
  /** px from an edge that counts as "reached" (the viewport overscan). */
  edgeThreshold: number
  /**
   * Infinite-scroll growth beyond the derived range (root-owned refs; `null`
   * until an edge extends the axis). Driven here, read by the root's
   * `start`/`end` computeds.
   */
  extendedStart: ShallowRef<Date | null>
  extendedEnd: ShallowRef<Date | null>
}

/**
 * Timeline-edge detection: emits `range-change` when the viewport reaches an
 * edge, and in `infinite` mode grows the axis (via the root-owned
 * `extendedStart`/`extendedEnd`). `fixed` mode only emits the suggestion and
 * discards any prior growth.
 */
export function useGanttTimelineEdges(options: TimelineEdgesOptions): void {
  // Previous edge-zone snapshot, so a reach fires once per entry into a zone (not
  // every scroll frame). `null` until the first measured frame — the initial
  // position (usually pinned to the left) must not count as a reach.
  let previousEdges: { start: boolean; end: boolean } | null = null

  // One growth step spans a screenful (falls back to two weeks when unmeasured).
  function extensionSpanDays(): number {
    const innerWidth = Math.max(0, options.viewport.width - options.sidebarWidth())
    const days = innerWidth / options.pxPerDay()
    if (days > 0) return days
    return EXTENSION_FALLBACK_DAYS
  }

  function reachStartEdge(): void {
    const proposedStart = floorToUnit(
      addDays(options.start(), -extensionSpanDays()),
      options.coarsestUnit(),
      options.weekBoundary?.(),
    )
    options.onRangeChange({ side: 'start', start: proposedStart, end: options.end() })
    if (options.timelineMode() !== 'infinite') return
    const previousStart = options.start()
    options.extendedStart.value = proposedStart
    // Prepending dates shifts every content-x right by the added width; once the
    // DOM has grown, nudge the scroll by that delta so the view stays anchored.
    nextTick(() => {
      const delta = options.widthBetween(proposedStart, previousStart)
      options.applyScroll(options.viewport.scrollLeft + delta, undefined, 'auto')
    })
  }

  function reachEndEdge(): void {
    const proposedEnd = ceilToUnit(
      addDays(options.end(), extensionSpanDays()),
      options.coarsestUnit(),
      options.weekBoundary?.(),
    )
    options.onRangeChange({ side: 'end', start: options.start(), end: proposedEnd })
    if (options.timelineMode() !== 'infinite') return
    options.extendedEnd.value = proposedEnd
  }

  watch(
    [() => options.viewport.scrollLeft, () => options.viewport.width, () => options.contentWidth()],
    () => {
      if (options.viewport.width <= 0) return
      const innerWidth = options.viewport.width - options.sidebarWidth()
      const nearStart = options.viewport.scrollLeft <= options.edgeThreshold
      const nearEnd =
        options.viewport.scrollLeft + innerWidth >= options.contentWidth() - options.edgeThreshold
      if (previousEdges) {
        if (nearStart && !previousEdges.start) reachStartEdge()
        if (nearEnd && !previousEdges.end) reachEndEdge()
      }
      previousEdges = { start: nearStart, end: nearEnd }
    },
  )

  // Dropping back to `fixed` discards any infinite-scroll growth.
  watch(options.timelineMode, mode => {
    if (mode === 'fixed') {
      options.extendedStart.value = null
      options.extendedEnd.value = null
    }
  })
}
