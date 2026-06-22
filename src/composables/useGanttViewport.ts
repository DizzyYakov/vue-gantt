import { onMounted, onUnmounted, toValue, watch, type MaybeRefOrGetter } from 'vue'
import { useGanttContext } from './useGanttContext'

/**
 * Wire a scroll container to the Gantt context: reports scroll position and
 * size so rows/columns can be virtualized and headers kept in sync. Call from a
 * component rendered *inside* `GanttRoot` (e.g. the `Gantt` wrapper's view).
 */
export function useGanttViewport(target: MaybeRefOrGetter<HTMLElement | null | undefined>): void {
  const { setViewport } = useGanttContext()
  let frame = 0
  let observer: ResizeObserver | undefined

  function measure(): void {
    const el = toValue(target)
    if (!el) return
    setViewport({
      scrollLeft: el.scrollLeft,
      scrollTop: el.scrollTop,
      width: el.clientWidth,
      height: el.clientHeight,
    })
  }

  // Coalesce the high-frequency scroll stream into one update per frame.
  function onScroll(): void {
    if (frame) return
    frame = requestAnimationFrame(() => {
      frame = 0
      measure()
    })
  }

  function attach(el: HTMLElement | null | undefined): void {
    if (!el) return
    measure()
    el.addEventListener('scroll', onScroll, { passive: true })
    if (typeof ResizeObserver !== 'undefined') {
      observer = new ResizeObserver(measure)
      observer.observe(el)
    }
  }

  function detach(el: HTMLElement | null | undefined): void {
    el?.removeEventListener('scroll', onScroll)
    observer?.disconnect()
    observer = undefined
    if (frame) {
      cancelAnimationFrame(frame)
      frame = 0
    }
  }

  onMounted(() => {
    attach(toValue(target))
    // Re-bind if the element ref changes.
    watch(
      () => toValue(target),
      (el, prev) => {
        detach(prev)
        attach(el)
      },
    )
  })

  onUnmounted(() => detach(toValue(target)))
}
