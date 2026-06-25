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
  })
})
