/** A point in body pixel space. */
export interface DependencyPoint {
  x: number
  y: number
}

/** A function that builds an SVG path `d` from a tail (predecessor finish) to a
 *  head (successor start) point. */
export type DependencyPathBuilder = (tail: DependencyPoint, head: DependencyPoint) => string

/** Horizontal stub length before/after the elbow and bezier connectors. */
export const STUB = 12

/** Elbow path: orthogonal segments. Always approaches the head from the left so
 *  the arrowhead points rightward, jogging at mid-height when space is tight. */
export function elbowPath(tail: DependencyPoint, head: DependencyPoint): string {
  const firstX = tail.x + STUB
  const approachX = head.x - STUB
  return approachX >= firstX
    ? `M ${tail.x} ${tail.y} H ${approachX} V ${head.y} H ${head.x}`
    : `M ${tail.x} ${tail.y} H ${firstX} V ${(tail.y + head.y) / 2} H ${approachX} V ${head.y} H ${head.x}`
}

/** Straight path: a single line from tail to head. */
export function straightPath(tail: DependencyPoint, head: DependencyPoint): string {
  return `M ${tail.x} ${tail.y} L ${head.x} ${head.y}`
}

/** Bezier path: a smooth cubic curve entering/leaving horizontally, so it reads
 *  as a finish-to-start link even when tail and head sit on different rows. */
export function bezierPath(tail: DependencyPoint, head: DependencyPoint): string {
  const dx = Math.max(STUB, Math.abs(head.x - tail.x) / 2)
  return `M ${tail.x} ${tail.y} C ${tail.x + dx} ${tail.y}, ${head.x - dx} ${head.y}, ${head.x} ${head.y}`
}
