import { describe, expect, it } from 'vitest'
import { bezierPath, elbowPath, straightPath, type DependencyPoint } from '../dependencyPaths'

const tail: DependencyPoint = { x: 0, y: 0 }
const head: DependencyPoint = { x: 100, y: 40 }

describe('dependencyPaths', () => {
  describe('elbowPath', () => {
    it('builds orthogonal segments (M…H…V…)', () => {
      const d = elbowPath(tail, head)
      expect(d).toMatch(/^M /)
      expect(d).toContain('H')
      expect(d).toContain('V')
      // No diagonal/curve commands.
      expect(d).not.toContain('L')
      expect(d).not.toContain('C')
    })

    it('jogs at mid-height for a backward/tight gap (extra segments)', () => {
      // head sits to the left of the tail → no room for a single elbow.
      const d = elbowPath({ x: 100, y: 0 }, { x: 0, y: 40 })
      expect(d.split(/[VH]/).length).toBeGreaterThan(3)
    })

    it('without hints is identical to the FS (1,1) hinted output', () => {
      // Backward compatibility: builders written before hints existed and the
      // default hints must produce byte-identical FS paths.
      expect(elbowPath(tail, head)).toBe(elbowPath(tail, head, { tailDir: 1, headDir: 1 }))
      expect(elbowPath(tail, head)).toBe('M 0 0 H 88 V 40 H 100')
    })

    it('FS (1,1): enters the head moving rightward (arrow points right)', () => {
      // Final segment: H from approachX (head.x−STUB) to head.x → left-to-right.
      expect(elbowPath(tail, head, { tailDir: 1, headDir: 1 })).toMatch(/H 88 V 40 H 100$/)
    })

    it('SS (-1,1): shares one outer vertical on the left, no jog', () => {
      // tail leaves leftward from the start edge; head entered rightward.
      const d = elbowPath({ x: 50, y: 0 }, { x: 100, y: 40 }, { tailDir: -1, headDir: 1 })
      // outerX = min(50−12, 100−12) = 38.
      expect(d).toBe('M 50 0 H 38 V 40 H 100')
    })

    it('FF (1,-1): approaches the head from the right (arrow points left)', () => {
      const d = elbowPath({ x: 0, y: 0 }, { x: 100, y: 40 }, { tailDir: 1, headDir: -1 })
      // outerX = max(0+12, 100+12) = 112; final H runs right-to-left into head.x.
      expect(d).toBe('M 0 0 H 112 V 40 H 100')
    })

    it('SF (-1,-1): mirrors FS leftward, jogging when space is tight', () => {
      // Roomy: head well left of tail → single elbow, entered from the right.
      const roomy = elbowPath({ x: 100, y: 0 }, { x: 0, y: 40 }, { tailDir: -1, headDir: -1 })
      expect(roomy).toBe('M 100 0 H 12 V 40 H 0')
      // Tight: head right of tail → mid-height jog, still entered from the right.
      const tight = elbowPath({ x: 0, y: 0 }, { x: 100, y: 40 }, { tailDir: -1, headDir: -1 })
      expect(tight).toBe('M 0 0 H -12 V 20 H 112 V 40 H 100')
    })
  })

  describe('straightPath', () => {
    it('builds a single line (M tx ty L hx hy), no H/V', () => {
      const d = straightPath(tail, head)
      expect(d).toBe('M 0 0 L 100 40')
      expect(d).toContain(' L ')
      expect(d).not.toContain('H')
      expect(d).not.toContain('V')
    })
  })

  describe('bezierPath', () => {
    it('builds a cubic curve (contains C)', () => {
      const d = bezierPath(tail, head)
      expect(d).toMatch(/^M /)
      expect(d).toContain('C')
      expect(d).not.toContain('H')
      expect(d).not.toContain('V')
    })

    it('without hints is identical to the FS (1,1) hinted output', () => {
      expect(bezierPath(tail, head)).toBe(bezierPath(tail, head, { tailDir: 1, headDir: 1 }))
    })

    it('mirrors the control points along the hinted directions', () => {
      // dx = max(12, 100/2) = 50. FF: cp1 rightward (0+50), cp2 beyond head (100+50)
      // so the curve's end tangent enters the head moving leftward.
      expect(bezierPath(tail, head, { tailDir: 1, headDir: -1 })).toBe(
        'M 0 0 C 50 0, 150 40, 100 40',
      )
      // SS: cp1 leftward (0−50), cp2 before head (100−50) — enters rightward.
      expect(bezierPath(tail, head, { tailDir: -1, headDir: 1 })).toBe(
        'M 0 0 C -50 0, 50 40, 100 40',
      )
    })
  })
})
