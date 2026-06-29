/** Pixels from an edge within which a drag starts auto-scrolling the viewport. */
export const AUTOSCROLL_EDGE = 48
/** Maximum auto-scroll speed, px per animation frame (reached at/over the edge). */
export const AUTOSCROLL_MAX_SPEED = 18

/** A pointer position in client (viewport) coordinates. */
export interface AutoscrollPointer {
  x: number
  y: number
}

/** Per-axis scroll velocity in px/frame (sign = direction). */
export interface EdgeVelocity {
  vx: number
  vy: number
}

interface EdgeRect {
  left: number
  top: number
  right: number
  bottom: number
}

// Ramps 0 → `max` as the pointer goes from `edge` px away to the edge (and past
// it, when outside the viewport). Clamped to [0, max].
function ramp(dist: number, edge: number, max: number): number {
  return max * Math.min(1, Math.max(0, (edge - dist) / edge))
}

/**
 * Velocity (px/frame) to auto-scroll a viewport `rect` given a `pointer`: pulls
 * toward whichever edge the pointer is within `edge` of (the nearer edge wins),
 * accelerating toward it. Zero when the pointer sits in the middle. Pure.
 */
export function edgeVelocity(
  rect: EdgeRect,
  pointer: AutoscrollPointer,
  edge = AUTOSCROLL_EDGE,
  max = AUTOSCROLL_MAX_SPEED,
): EdgeVelocity {
  const axis = (distStart: number, distEnd: number): number => {
    if (distStart < edge && distStart <= distEnd) return -ramp(distStart, edge, max)
    if (distEnd < edge) return ramp(distEnd, edge, max)
    return 0
  }
  return {
    vx: axis(pointer.x - rect.left, rect.right - pointer.x),
    vy: axis(pointer.y - rect.top, rect.bottom - pointer.y),
  }
}

/**
 * Edge auto-scroll engine for drags. Feed it the live pointer via `update()`
 * while a drag is active; it runs a rAF loop that scrolls the element (returned
 * by `getEl`) toward whichever edge the pointer approaches, clamped to the
 * scroll bounds. `update(null)` stops it.
 */
export function useGanttAutoscroll(
  getEl: () => HTMLElement | null,
  // Max scroll offset per axis, derived from the *content* (not `el.scrollWidth/
  // Height`, which a dragged ghost can inflate by overflowing the body — that
  // would let the auto-scroll chase the ghost past the chart forever).
  getMaxScroll?: (el: HTMLElement) => { x: number; y: number },
): {
  update: (pointer: AutoscrollPointer | null) => void
} {
  let pointer: AutoscrollPointer | null = null
  let raf = 0

  function schedule(): void {
    if (!raf && typeof requestAnimationFrame === 'function') {
      raf = requestAnimationFrame(step)
    }
  }

  function step(): void {
    raf = 0
    const el = getEl()
    if (!pointer || !el) return
    const rect = el.getBoundingClientRect()
    if (rect.width > 0 && rect.height > 0) {
      const { vx, vy } = edgeVelocity(rect, pointer)
      const max = getMaxScroll
        ? getMaxScroll(el)
        : { x: el.scrollWidth - el.clientWidth, y: el.scrollHeight - el.clientHeight }
      if (vx) {
        el.scrollLeft = Math.min(Math.max(0, max.x), Math.max(0, el.scrollLeft + vx))
      }
      if (vy) {
        el.scrollTop = Math.min(Math.max(0, max.y), Math.max(0, el.scrollTop + vy))
      }
    }
    // Keep looping while a drag is active so holding at the edge keeps scrolling.
    schedule()
  }

  function update(next: AutoscrollPointer | null): void {
    pointer = next
    if (next) {
      schedule()
    } else if (raf) {
      if (typeof cancelAnimationFrame === 'function') cancelAnimationFrame(raf)
      raf = 0
    }
  }

  return { update }
}
