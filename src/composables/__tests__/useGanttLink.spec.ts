import { afterEach, beforeEach, describe, expect, it, vi, type Mock } from 'vitest'
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
  const autoScroll = vi.fn<(pointer: { x: number; y: number } | null) => void>()
  const dispatch = vi.fn<() => void>()
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
  let efp: Mock<(x: number, y: number) => Element | null>
  const original = Object.getOwnPropertyDescriptor(Document.prototype, 'elementFromPoint')

  beforeEach(() => {
    // Default: pointer is over empty space unless a test says otherwise.
    efp = vi.fn<(x: number, y: number) => Element | null>().mockReturnValue(null)
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

  describe('typed links (drop halves)', () => {
    /** A target bar at left=100, width=60 → midpoint x=130. */
    function rectEl(id: string): HTMLElement {
      const el = taskEl(id)
      el.getBoundingClientRect = () =>
        ({ left: 100, width: 60, top: 0, height: 20, right: 160, bottom: 20, x: 100, y: 0 }) as DOMRect
      return el
    }

    it.each([
      ['finish', 110, 'start', 'FS'],
      ['finish', 150, 'finish', 'FF'],
      ['start', 110, 'start', 'SS'],
      ['start', 150, 'finish', 'SF'],
    ] as const)(
      '%s-edge anchor dropped on the %s half creates a %s link',
      (anchorEdge, x, half, type) => {
        const { api, dispatch } = makeLink()
        api.beginLink({ ...begin, anchorEdge })

        efp.mockReturnValue(rectEl('b'))
        pointerMove(x, 10)
        // The hovered half live-previews the pending head letter.
        expect(api.linkDraft.value?.overEdge).toBe(half)

        api.endLink()
        expect(dispatch).toHaveBeenCalledWith('dependency-create', { from: 'a', to: 'b', type })
      },
    )

    it('reroute-head keeps the tail letter + lag; the drop half picks the head letter', () => {
      const { api, dispatch } = makeLink()
      api.beginLink({
        anchorId: 'a',
        anchorEdge: 'start',
        mode: 'reroute-head',
        link: { from: 'a', to: 'b', type: 'SS', lag: 2 },
        pointer: { x: 10, y: 10 },
      })

      efp.mockReturnValue(rectEl('c'))
      pointerMove(150, 10) // finish half → head letter F

      api.endLink()
      expect(dispatch).toHaveBeenCalledWith('dependency-update', {
        from: 'a',
        to: 'c',
        type: 'SF',
        lag: 2,
        previous: { from: 'a', to: 'b', type: 'SS', lag: 2 },
      })
    })

    it('reroute-tail keeps the head letter + lag; the drop half picks the new tail letter', () => {
      const { api, dispatch } = makeLink()
      api.beginLink({
        anchorId: 'b',
        anchorEdge: 'finish',
        mode: 'reroute-tail',
        link: { from: 'a', to: 'b', type: 'FF', lag: 3 },
        pointer: { x: 10, y: 10 },
      })

      efp.mockReturnValue(rectEl('c'))
      pointerMove(110, 10) // start half → new tail letter S

      api.endLink()
      expect(dispatch).toHaveBeenCalledWith('dependency-update', {
        from: 'c',
        to: 'b',
        type: 'SF',
        lag: 3,
        previous: { from: 'a', to: 'b', type: 'FF', lag: 3 },
      })
    })

    it('reroute-tail ignores a drop back onto the current predecessor or the successor itself', () => {
      const { api, dispatch } = makeLink()
      const beginArgs = {
        anchorId: 'b',
        anchorEdge: 'finish' as const,
        mode: 'reroute-tail' as const,
        link: { from: 'a', to: 'b' },
        pointer: { x: 10, y: 10 },
      }

      api.beginLink(beginArgs)
      efp.mockReturnValue(rectEl('a')) // same predecessor
      pointerMove(110, 10)
      api.endLink()
      expect(dispatch).not.toHaveBeenCalled()

      api.beginLink(beginArgs)
      efp.mockReturnValue(rectEl('b')) // the successor itself (self-link)
      pointerMove(110, 10)
      api.endLink()
      expect(dispatch).not.toHaveBeenCalled()
    })

    it('the duplicate guard blocks a second link to the same pair regardless of type', () => {
      const existing = {
        id: 'b',
        dependencies: ['a'],
        links: [{ id: 'a', type: 'SS', lag: 0 }],
      } as unknown as ResolvedTask
      const { api, dispatch } = makeLink({ tasks: () => [existing] })
      api.beginLink(begin)

      efp.mockReturnValue(rectEl('b'))
      pointerMove(150, 10)

      api.endLink()
      expect(dispatch).not.toHaveBeenCalled()
    })
  })
})
