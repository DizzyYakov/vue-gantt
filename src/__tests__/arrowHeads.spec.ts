import { describe, expect, it } from 'vitest'
import { noArrow, openArrow, triangleArrow } from '../arrowHeads'

describe('arrowHeads', () => {
  it('triangleArrow is a closed, filled triangle', () => {
    const a = triangleArrow()
    expect(a.d).toBe('M0,0 L6,3 L0,6 Z')
    expect(a.filled).toBe(true)
  })

  it('openArrow is an open (unfilled) chevron', () => {
    const a = openArrow()
    expect(a.d).toBe('M0,0 L6,3 L0,6')
    expect(a.d).not.toContain('Z')
    expect(a.filled).toBe(false)
  })

  it('noArrow returns null (no head)', () => {
    expect(noArrow()).toBeNull()
  })
})
