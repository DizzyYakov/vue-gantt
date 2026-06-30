import { describe, expect, it } from 'vitest'
import { clampFloatingLeft } from '../useHoverTooltip'

/**
 * Pure clamp used to keep the floating hover tooltip inside `[0, contentWidth]`.
 *  - `centered` (marker, translateX(-50%)): centre clamped to `[w/2, contentWidth - w/2]`.
 *  - left-anchored (bar): left clamped to `[0, contentWidth - w]`.
 */
describe('clampFloatingLeft', () => {
  const contentWidth = 1000

  describe('left-anchored (centered=false)', () => {
    it('passes through a normal anchor in the middle', () => {
      // box [400, 600] fits in [0, 1000] → unchanged
      expect(clampFloatingLeft(400, 200, contentWidth, false)).toBe(400)
    })

    it('clamps when the right edge overflows the content', () => {
      // anchor 950 → box [950, 1150] overflows; left pinned to contentWidth - width
      expect(clampFloatingLeft(950, 200, contentWidth, false)).toBe(800)
    })

    it('clamps when the left edge undershoots 0', () => {
      // negative anchor → left pinned to 0
      expect(clampFloatingLeft(-50, 200, contentWidth, false)).toBe(0)
    })

    it('passes the anchor through when width is 0 (not measured yet)', () => {
      expect(clampFloatingLeft(950, 0, contentWidth, false)).toBe(950)
    })

    it('pins left to 0 when the box is wider than the content', () => {
      // width 1200 > contentWidth 1000 → lower bound (0) wins
      expect(clampFloatingLeft(500, 1200, contentWidth, false)).toBe(0)
    })
  })

  describe('centered (centered=true)', () => {
    it('passes through a normal anchor in the middle', () => {
      // centre 500, half-width 100 → box [400, 600] fits → unchanged
      expect(clampFloatingLeft(500, 200, contentWidth, true)).toBe(500)
    })

    it('clamps when the right edge overflows the content', () => {
      // anchor 980, half-width 100 → right edge 1080 overflows; centre pinned to contentWidth - w/2
      expect(clampFloatingLeft(980, 200, contentWidth, true)).toBe(900)
    })

    it('clamps when the left edge undershoots 0', () => {
      // anchor 10, half-width 100 → left edge -90; centre pinned to w/2
      expect(clampFloatingLeft(10, 200, contentWidth, true)).toBe(100)
    })

    it('passes the anchor through when width is 0 (not measured yet)', () => {
      expect(clampFloatingLeft(980, 0, contentWidth, true)).toBe(980)
    })

    it('pins the centre to w/2 (left edge to 0) when the box is wider than the content', () => {
      // width 1200 > contentWidth 1000 → lower bound (w/2 = 600) wins; with translateX(-50%) the left edge is 0
      expect(clampFloatingLeft(500, 1200, contentWidth, true)).toBe(600)
    })
  })
})
