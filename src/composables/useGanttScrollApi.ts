import { shallowRef, type ShallowRef } from 'vue'
import { toDate } from '../context'
import type { ResolvedRow, ResolvedTask } from '../types'

export interface ScrollToOptions {
  behavior?: ScrollBehavior
  align?: 'start' | 'center'
}

/** Imperatively scroll the container to a content offset. */
export type ApplyScrollFn = (
  left: number | undefined,
  top: number | undefined,
  behavior: ScrollBehavior,
) => void

export interface ScrollApiOptions {
  /** Content-x (px) for a date, via the scale. */
  dateToX: (date: Date | string | number) => number
  sidebarWidth: () => number
  rowHeight: () => number
  tasks: () => ResolvedTask[]
  rows: () => ResolvedRow[]
  today: () => Date
}

export interface GanttScrollApi {
  /** The registered scroll container (or `null` before mount / for primitives). */
  scrollerEl: ShallowRef<HTMLElement | null>
  setScroller: (el: HTMLElement | null) => void
  applyScroll: ApplyScrollFn
  scrollToDate: (date: Date | string | number, options?: ScrollToOptions) => void
  scrollToTask: (id: string, options?: ScrollToOptions) => void
  scrollToToday: (options?: ScrollToOptions) => void
}

/**
 * Imperative scroll API for the chart. The scroll container (registered by
 * `GanttView`) lives below the frozen sidebar/header in the scroll flow, so a
 * content-x maps to `scrollLeft` directly (the sidebar occupies the first
 * `sidebarWidth` px of the scrollable row). `applyScroll` is exposed because the
 * timeline-edge growth (infinite scroll) also nudges the scroll position.
 */
export function useGanttScrollApi(options: ScrollApiOptions): GanttScrollApi {
  const scrollerEl = shallowRef<HTMLElement | null>(null)

  function setScroller(el: HTMLElement | null): void {
    scrollerEl.value = el
  }

  const applyScroll: ApplyScrollFn = (left, top, behavior) => {
    const el = scrollerEl.value
    if (!el) return
    const x = left == null ? undefined : Math.max(0, left)
    const y = top == null ? undefined : Math.max(0, top)
    if (typeof el.scrollTo === 'function') {
      el.scrollTo({ left: x, top: y, behavior })
    } else {
      // jsdom / older engines: assign directly.
      if (x != null) el.scrollLeft = x
      if (y != null) el.scrollTop = y
    }
  }

  function leftForDate(date: Date | string | number, align: 'start' | 'center'): number {
    const el = scrollerEl.value
    const x = options.dateToX(toDate(date))
    if (align === 'center' && el) return x - (el.clientWidth - options.sidebarWidth()) / 2
    return x
  }

  function scrollToDate(date: Date | string | number, scrollOptions: ScrollToOptions = {}): void {
    applyScroll(
      leftForDate(date, scrollOptions.align ?? 'start'),
      undefined,
      scrollOptions.behavior ?? 'smooth',
    )
  }

  function scrollToTask(id: string, scrollOptions: ScrollToOptions = {}): void {
    const task = options.tasks().find(t => t.id === id)
    if (!task) return
    const row = options.rows()[task.order]
    const top = row ? row.top : task.order * options.rowHeight()
    applyScroll(
      leftForDate(task.start, scrollOptions.align ?? 'start'),
      top,
      scrollOptions.behavior ?? 'smooth',
    )
  }

  function scrollToToday(scrollOptions: ScrollToOptions = {}): void {
    scrollToDate(options.today(), scrollOptions)
  }

  return { scrollerEl, setScroller, applyScroll, scrollToDate, scrollToTask, scrollToToday }
}
