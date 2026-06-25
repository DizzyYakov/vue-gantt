/** Shape drawn inside the dependency `<marker>` box (8×8, head at refX/refY 6,3). */
export interface ArrowHeadShape {
  /** SVG path `d` for the marker, in the marker coordinate box. */
  d: string
  /** Filled (default) vs stroked outline only. */
  filled?: boolean
}

/** Builds a dependency arrowhead. Return `null` to draw no arrowhead. */
export type ArrowHeadBuilder = () => ArrowHeadShape | null

/** Filled triangle (default). */
export function triangleArrow(): ArrowHeadShape {
  return { d: 'M0,0 L6,3 L0,6 Z', filled: true }
}

/** Open (stroked, unfilled) chevron. */
export function openArrow(): ArrowHeadShape {
  return { d: 'M0,0 L6,3 L0,6', filled: false }
}

/** No arrowhead — connectors render without a head. */
export function noArrow(): null {
  return null
}
