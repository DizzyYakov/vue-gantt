/** A point in body pixel space. */
export interface DependencyPoint {
  x: number
  y: number
}

/**
 * Direction hints for a path builder, derived from the link type. `1` means the
 * path runs rightward at that endpoint (leaving a finish edge / entering a start
 * edge), `-1` leftward (leaving a start edge / entering an end edge). Omitted
 * hints default to `1`/`1` — the classic finish-to-start orientation — so
 * builders written before hints existed keep rendering FS links correctly.
 */
export interface DependencyPathHints {
  /** Horizontal direction the path leaves the tail. Default `1` (rightward). */
  tailDir?: 1 | -1
  /** Horizontal direction the path enters the head. Default `1` (rightward). */
  headDir?: 1 | -1
}

/**
 * A function that builds an SVG path `d` from a tail (predecessor) to a head
 * (successor) point. `hints` orients the endpoints per the link type; builders
 * that ignore it (e.g. pre-existing custom ones) simply draw every link in the
 * finish-to-start orientation.
 */
export type DependencyPathBuilder = (
  tail: DependencyPoint,
  head: DependencyPoint,
  hints?: DependencyPathHints,
) => string

/** Horizontal stub length before/after the elbow and bezier connectors. */
export const STUB = 12

/**
 * Elbow path: orthogonal segments. Each endpoint gets a stub in its hinted
 * direction; the head is always entered along `headDir` so the auto-oriented
 * arrowhead points into the bar edge. Same-direction endpoints jog at
 * mid-height when space is tight; opposite-direction endpoints share one outer
 * vertical instead (no jog case exists).
 */
export function elbowPath(
  tail: DependencyPoint,
  head: DependencyPoint,
  hints?: DependencyPathHints,
): string {
  const td = hints?.tailDir ?? 1
  const hd = hints?.headDir ?? 1
  const firstX = tail.x + STUB * td
  const approachX = head.x - STUB * hd

  if (td !== hd) {
    // FF / SS: both stubs sit on the same outer side of the two edges.
    const outerX = td === 1 ? Math.max(firstX, approachX) : Math.min(firstX, approachX)
    return `M ${tail.x} ${tail.y} H ${outerX} V ${head.y} H ${head.x}`
  }
  return (approachX - firstX) * td >= 0
    ? `M ${tail.x} ${tail.y} H ${approachX} V ${head.y} H ${head.x}`
    : `M ${tail.x} ${tail.y} H ${firstX} V ${(tail.y + head.y) / 2} H ${approachX} V ${head.y} H ${head.x}`
}

/** Straight path: a single line from tail to head (hints don't apply). */
export function straightPath(tail: DependencyPoint, head: DependencyPoint): string {
  return `M ${tail.x} ${tail.y} L ${head.x} ${head.y}`
}

/** Bezier path: a smooth cubic curve entering/leaving horizontally along the
 *  hinted directions, so the link reads correctly for every link type. */
export function bezierPath(
  tail: DependencyPoint,
  head: DependencyPoint,
  hints?: DependencyPathHints,
): string {
  const td = hints?.tailDir ?? 1
  const hd = hints?.headDir ?? 1
  const dx = Math.max(STUB, Math.abs(head.x - tail.x) / 2)
  return `M ${tail.x} ${tail.y} C ${tail.x + dx * td} ${tail.y}, ${head.x - dx * hd} ${head.y}, ${head.x} ${head.y}`
}
