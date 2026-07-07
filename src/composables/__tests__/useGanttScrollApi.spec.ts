import { describe, expect, it, vi } from 'vitest'
import { useGanttScrollApi, type ScrollApiOptions } from '../useGanttScrollApi'
import type { ResolvedRow, ResolvedTask } from '../../types'

// Pure composable (no Vue context) — drive it directly, like `useGanttLink.spec.ts`.

function makeTask(overrides: Partial<ResolvedTask> = {}): ResolvedTask {
  return {
    id: 't1',
    name: 't1',
    start: new Date(2026, 0, 10),
    end: new Date(2026, 0, 15),
    progress: 0,
    dependencies: [],
    type: 'task',
    meta: {},
    rowId: 'r1',
    order: 0,
    lane: 0,
    ...overrides,
  }
}

function makeRow(overrides: Partial<ResolvedRow> = {}): ResolvedRow {
  return {
    id: 'r1',
    name: 'Row 1',
    order: 0,
    meta: {},
    tasks: [],
    groupId: '',
    parentId: '',
    depth: 0,
    hasChildren: false,
    childIds: [],
    collapsed: false,
    hidden: false,
    laneCount: 1,
    top: 0,
    height: 32,
    ...overrides,
  }
}

/** An element with a real `scrollTo` mock. */
function makeScrollerWithScrollTo(clientWidth = 1000): HTMLElement {
  const el = {
    clientWidth,
    scrollTo: vi.fn<(options: { left?: number; top?: number; behavior?: ScrollBehavior }) => void>(),
  } as unknown as HTMLElement
  return el
}

/** An element with no `scrollTo` (jsdom / older engines): assigns properties directly. */
function makeScrollerWithoutScrollTo(clientWidth = 1000): HTMLElement {
  const el = { clientWidth, scrollLeft: 0, scrollTop: 0 } as unknown as HTMLElement
  return el
}

function makeApi(overrides: Partial<ScrollApiOptions> = {}) {
  const dateToX = vi.fn<(date: Date | string | number) => number>(date => {
    const time = date instanceof Date ? date.getTime() : new Date(date).getTime()
    // A trivial linear mapping: 1 day (from epoch-local 2026-01-01) = 10px.
    const origin = new Date(2026, 0, 1).getTime()
    return Math.round(((time - origin) / (24 * 60 * 60 * 1000)) * 10)
  })
  const options: ScrollApiOptions = {
    dateToX,
    sidebarWidth: () => 200,
    rowHeight: () => 32,
    tasks: () => [],
    rows: () => [],
    today: () => new Date(2026, 0, 1),
    ...overrides,
  }
  const api = useGanttScrollApi(options)
  return { api, dateToX, options }
}

describe('useGanttScrollApi', () => {
  it('setScroller registers the element', () => {
    const { api } = makeApi()
    const el = makeScrollerWithScrollTo()

    api.setScroller(el)

    expect(api.scrollerEl.value).toBe(el)
  })

  it('scrollToDate scrolls to dateToX(date) with align "start" (default)', () => {
    const { api, dateToX } = makeApi()
    const el = makeScrollerWithScrollTo()
    api.setScroller(el)

    api.scrollToDate('2026-01-11')

    const expectedLeft = dateToX(new Date(2026, 0, 11))
    expect(el.scrollTo).toHaveBeenCalledWith({ left: expectedLeft, top: undefined, behavior: 'smooth' })
  })

  it('scrollToDate centers the target when align is "center"', () => {
    const { api, dateToX } = makeApi({ sidebarWidth: () => 200 })
    const el = makeScrollerWithScrollTo(1000)
    api.setScroller(el)

    // Far enough from the origin that the centered offset stays positive
    // (applyScroll clamps negatives to 0 — covered separately below).
    api.scrollToDate('2026-03-01', { align: 'center' })

    // left = x - (clientWidth - sidebarWidth) / 2 = x - (1000 - 200) / 2 = x - 400
    const x = dateToX(new Date(2026, 2, 1))
    expect(el.scrollTo).toHaveBeenCalledWith({ left: x - 400, top: undefined, behavior: 'smooth' })
  })

  it('scrollToTask finds the task by id and scrolls to its start + row.top', () => {
    // `rows()` is indexed positionally by `order` (see `GanttRoot`'s contract),
    // so the target row must sit at index `task.order`.
    const task = makeTask({ id: 'a', start: new Date(2026, 0, 21), order: 1 })
    const rows = [makeRow({ id: 'rowFiller', order: 0, top: 0 }), makeRow({ id: 'rowA', order: 1, top: 96 })]
    const { api } = makeApi({ tasks: () => [task], rows: () => rows })
    const el = makeScrollerWithScrollTo()
    api.setScroller(el)

    api.scrollToTask('a')

    expect(el.scrollTo).toHaveBeenCalledWith({ left: 200, top: 96, behavior: 'smooth' })
  })

  it('scrollToTask is a no-op for an unknown id', () => {
    const { api } = makeApi({ tasks: () => [makeTask({ id: 'known' })] })
    const el = makeScrollerWithScrollTo()
    api.setScroller(el)

    api.scrollToTask('unknown')

    expect(el.scrollTo).not.toHaveBeenCalled()
  })

  it('scrollToToday delegates to scrollToDate with the today() value', () => {
    const today = new Date(2026, 0, 3)
    const { api } = makeApi({ today: () => today })
    const el = makeScrollerWithScrollTo()
    api.setScroller(el)

    api.scrollToToday()

    expect(el.scrollTo).toHaveBeenCalledWith({ left: 20, top: undefined, behavior: 'smooth' })
  })

  it('applyScroll clamps negative offsets to 0 (scrollTo path)', () => {
    const { api } = makeApi()
    const el = makeScrollerWithScrollTo()
    api.setScroller(el)

    api.applyScroll(-50, -10, 'auto')

    expect(el.scrollTo).toHaveBeenCalledWith({ left: 0, top: 0, behavior: 'auto' })
  })

  it('applyScroll clamps negative offsets to 0 (direct-assignment path, no scrollTo)', () => {
    const { api } = makeApi()
    const el = makeScrollerWithoutScrollTo()
    api.setScroller(el)

    api.applyScroll(-50, -10, 'auto')

    expect(el.scrollLeft).toBe(0)
    expect(el.scrollTop).toBe(0)
  })

  it('applyScroll is a no-op when no scroller is registered', () => {
    const { api } = makeApi()
    expect(() => api.applyScroll(10, 10, 'auto')).not.toThrow()
  })
})
