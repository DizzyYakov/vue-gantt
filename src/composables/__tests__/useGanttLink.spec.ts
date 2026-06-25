import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useGanttLink, type LinkOptions } from '../useGanttLink'
import type { GanttBeginLinkArgs, ResolvedTask } from '../../types'

// `useGanttLink` is a pure composable (no Vue context) — drive it directly and
// stub the DOM bits jsdom doesn't compute (elementFromPoint).

const begin: GanttBeginLinkArgs = {
  anchorId: 'a',
  anchorEdge: 'finish',
  mode: 'create',
  pointer: { x: 10, y: 10 },
}

/** A `[data-id]` host element, as `taskIdAt` expects to find via `closest`. */
function taskEl(id: string): HTMLElement {
  const el = document.createElement('div')
  el.setAttribute('data-id', id)
  return el
}

function makeLink(overrides: Partial<LinkOptions> = {}) {
  const autoScroll = vi.fn()
  const dispatch = vi.fn()
  const api = useGanttLink({
    dispatch,
    tasks: () => [] as ResolvedTask[],
    autoScroll,
    ...overrides,
  })
  return { api, autoScroll, dispatch }
}

function pointerMove(x: number, y: number): void {
  window.dispatchEvent(new PointerEvent('pointermove', { clientX: x, clientY: y }))
}

describe('useGanttLink', () => {
  // jsdom doesn't implement `document.elementFromPoint` at all (so `vi.spyOn`
  // can't wrap it) — install a mock fn we can re-point per test.
  let efp: ReturnType<typeof vi.fn>
  const original = Object.getOwnPropertyDescriptor(Document.prototype, 'elementFromPoint')

  beforeEach(() => {
    // Default: pointer is over empty space unless a test says otherwise.
    efp = vi.fn().mockReturnValue(null)
    document.elementFromPoint = efp as unknown as typeof document.elementFromPoint
  })

  afterEach(() => {
    if (original) Object.defineProperty(Document.prototype, 'elementFromPoint', original)
    else delete (document as Partial<Document>).elementFromPoint
    // Ensure no dangling window listeners leak between tests.
    document.body.style.userSelect = ''
    document.body.style.cursor = ''
  })

  it('drives autoScroll with the pointer on each move', () => {
    // arrange
    const { api, autoScroll } = makeLink()
    api.beginLink(begin)

    // act
    pointerMove(120, 45)

    // assert
    expect(autoScroll).toHaveBeenCalledWith({ x: 120, y: 45 })

    api.endLink(null)
  })

  it('refresh() is a no-op with no active draft', () => {
    const { api } = makeLink()
    // act / assert — must not throw, draft stays null
    expect(() => api.refresh()).not.toThrow()
    expect(api.linkDraft.value).toBeNull()
  })

  it('resolves `over` on move, then refresh() re-resolves from the last pointer', () => {
    // arrange
    const { api } = makeLink()
    api.beginLink(begin)

    // act: pointer lands over task "b"
    efp.mockReturnValue(taskEl('b'))
    pointerMove(200, 60)

    // assert: draft tracks the hovered task
    expect(api.linkDraft.value?.over).toBe('b')
    expect(api.linkDraft.value?.pointer).toEqual({ x: 200, y: 60 })

    // act: content scrolled under a stationary pointer — now "c" is there.
    // refresh() re-runs resolution from the remembered last pointer (no move).
    efp.mockReturnValue(taskEl('c'))
    api.refresh()

    // assert: target updated without a new pointer event
    expect(api.linkDraft.value?.over).toBe('c')
    expect(api.linkDraft.value?.pointer).toEqual({ x: 200, y: 60 })

    api.endLink(null)
  })

  it('never marks the anchor itself as a drop target', () => {
    const { api } = makeLink()
    api.beginLink(begin)

    efp.mockReturnValue(taskEl('a')) // the anchor
    pointerMove(15, 15)

    expect(api.linkDraft.value?.over).toBeNull()
    api.endLink(null)
  })

  it('stops autoScroll on endLink/teardown', () => {
    const { api, autoScroll } = makeLink()
    api.beginLink(begin)
    autoScroll.mockClear() // ignore the begin-time state

    // act
    api.endLink(null)

    // assert: teardown passes null to halt the rAF loop, and clears the draft
    expect(autoScroll).toHaveBeenLastCalledWith(null)
    expect(api.linkDraft.value).toBeNull()
  })
})
