import { afterEach, beforeEach, describe, expect, it, vi, type Mock } from 'vitest'
import { h, nextTick } from 'vue'
import GanttDependencies from '../GanttDependencies.vue'
import { noArrow, openArrow } from '../../arrowHeads'
import { bezierPath, straightPath, type DependencyPathBuilder } from '../../dependencyPaths'
import type { GanttDependencyType, GanttRow } from '../../types'
import { mountInRoot } from '../../__tests__/helpers'

const rows: GanttRow[] = [
  {
    id: 'r1',
    tasks: [
      { id: 'a', start: '2026-01-01', end: '2026-01-05' },
      { id: 'b', start: '2026-01-06', end: '2026-01-10', dependencies: ['a'] },
    ],
  },
]

describe('GanttDependencies', () => {
  it('draws a finish-to-start arrow per dependency link', () => {
    const { wrapper } = mountInRoot(GanttDependencies, { rootProps: { rows, unit: 'day' } })
    const dep = wrapper.findAll('.gantt-dependency')
    expect(dep).toHaveLength(1)
    expect(dep[0]!.attributes('data-from')).toBe('a')
    expect(dep[0]!.attributes('data-to')).toBe('b')
    expect(dep[0]!.attributes('d')).toMatch(/^M /)
    expect(dep[0]!.attributes('marker-end')).toMatch(/^url\(#gantt-arrow-/)
  })

  it('ignores dependencies that reference an unknown task', () => {
    const { wrapper } = mountInRoot(GanttDependencies, {
      rootProps: {
        rows: [
          {
            id: 'r',
            tasks: [{ id: 'x', start: '2026-01-01', end: '2026-01-03', dependencies: ['ghost'] }],
          },
        ],
        unit: 'day',
      },
    })
    expect(wrapper.findAll('.gantt-dependency')).toHaveLength(0)
  })

  it('renders no arrows when there are no dependencies', () => {
    const { wrapper } = mountInRoot(GanttDependencies, {
      rootProps: {
        rows: [{ id: 'r', tasks: [{ id: 'a', start: '2026-01-01', end: '2026-01-03' }] }],
        unit: 'day',
      },
    })
    expect(wrapper.findAll('.gantt-dependency')).toHaveLength(0)
  })

  it('routes a backward link with a mid-height jog (more segments)', () => {
    // b precedes a in time but depends on it → tight/backward gap path.
    const { wrapper } = mountInRoot(GanttDependencies, {
      rootProps: {
        rows: [
          {
            id: 'r',
            tasks: [
              { id: 'a', start: '2026-01-10', end: '2026-01-15' },
              { id: 'b', start: '2026-01-01', end: '2026-01-05', dependencies: ['a'] },
            ],
          },
        ],
        unit: 'day',
      },
    })
    const d = wrapper.find('.gantt-dependency').attributes('d')!
    // The jog path has 4 V/H direction changes vs the simple elbow's fewer.
    expect(d.split(/[VH]/).length).toBeGreaterThan(3)
  })

  it('sizes the svg to the content box', () => {
    const { wrapper, ctx } = mountInRoot(GanttDependencies, { rootProps: { rows, unit: 'day' } })
    const svg = wrapper.find('svg.gantt-dependencies')
    expect(svg.attributes('width')).toBe(String(ctx().contentWidth.value))
    expect(svg.attributes('height')).toBe(String(ctx().contentHeight.value))
  })

  it('uses the straightPath builder passed to dependencyShape', () => {
    const { wrapper } = mountInRoot(GanttDependencies, {
      rootProps: { rows, unit: 'day', dependencyShape: straightPath },
    })
    const d = wrapper.find('.gantt-dependency').attributes('d')!
    expect(d).toContain(' L ')
    expect(d).not.toContain('H')
    expect(d).not.toContain('V')
  })

  it('uses the bezierPath builder passed to dependencyShape', () => {
    const { wrapper } = mountInRoot(GanttDependencies, {
      rootProps: { rows, unit: 'day', dependencyShape: bezierPath },
    })
    const d = wrapper.find('.gantt-dependency').attributes('d')!
    expect(d).toContain('C')
  })

  it('accepts a custom dependencyShape builder', () => {
    const custom = () => 'M 1 2 L 3 4'
    const { wrapper } = mountInRoot(GanttDependencies, {
      rootProps: { rows, unit: 'day', dependencyShape: custom },
    })
    expect(wrapper.find('.gantt-dependency').attributes('d')).toBe('M 1 2 L 3 4')
  })

  it('omits the arrowhead marker entirely when arrowHead returns null (noArrow)', () => {
    const { wrapper } = mountInRoot(GanttDependencies, {
      rootProps: { rows, unit: 'day', arrowHead: noArrow },
    })
    const dep = wrapper.find('.gantt-dependency')
    expect(dep.attributes('marker-end')).toBeUndefined()
    expect(wrapper.find('.gantt-dependencies__marker').exists()).toBe(false)
  })

  it('renders an open (stroked) marker for an unfilled arrowHead (openArrow)', () => {
    const { wrapper } = mountInRoot(GanttDependencies, {
      rootProps: { rows, unit: 'day', arrowHead: openArrow },
    })
    const marker = wrapper.find('.gantt-dependencies__marker')
    expect(marker.exists()).toBe(true)
    expect(marker.classes()).toContain('gantt-dependencies__marker--open')
    expect(wrapper.find('.gantt-dependency').attributes('marker-end')).toMatch(
      /^url\(#gantt-arrow-/,
    )
  })

  it('accepts a custom arrowHead builder', () => {
    const { wrapper } = mountInRoot(GanttDependencies, {
      rootProps: { rows, unit: 'day', arrowHead: () => ({ d: 'M0,0 L4,4 L0,8' }) },
    })
    expect(wrapper.find('.gantt-dependencies__marker path').attributes('d')).toBe('M0,0 L4,4 L0,8')
  })

  describe('typed link anchors', () => {
    // Predecessor a: Jan-01 → Jan-05; successor b: Jan-06 → Jan-10. Using
    // straightPath (`M tx ty L hx hy`) makes the tail/head x trivial to read.
    function typedRows(type: GanttDependencyType): GanttRow[] {
      return [
        {
          id: 'r1',
          tasks: [
            { id: 'a', start: '2026-01-01', end: '2026-01-05' },
            {
              id: 'b',
              start: '2026-01-06',
              end: '2026-01-10',
              dependencies: [{ id: 'a', type }],
            },
          ],
        },
      ]
    }

    it.each([
      ['FS', '2026-01-05', '2026-01-06'],
      ['SS', '2026-01-01', '2026-01-06'],
      ['FF', '2026-01-05', '2026-01-10'],
      ['SF', '2026-01-01', '2026-01-10'],
    ] as const)('anchors %s at the right edges (tail→%s, head→%s)', (type, tailDate, headDate) => {
      const { wrapper, ctx } = mountInRoot(GanttDependencies, {
        rootProps: { rows: typedRows(type), unit: 'day', dependencyShape: straightPath },
      })
      const d = wrapper.find('.gantt-dependency').attributes('d')!
      const [tx, , hx] = d.match(/^M ([\d.-]+) ([\d.-]+) L ([\d.-]+) ([\d.-]+)$/)!.slice(1)
      expect(Number(tx)).toBeCloseTo(ctx().dateToX(tailDate))
      expect(Number(hx)).toBeCloseTo(ctx().dateToX(headDate))
    })

    it('positions the reroute handle at the typed head edge (FF → successor end)', () => {
      const { wrapper, ctx } = mountInRoot(GanttDependencies, {
        rootProps: { rows: typedRows('FF'), unit: 'day', linkable: true },
      })
      const handle = wrapper.find('.gantt-dependency-handle')
      expect(Number(handle.attributes('cx'))).toBeCloseTo(ctx().dateToX('2026-01-10'))
    })
  })

  describe('draft preview arrow (dragging a new/re-routed link)', () => {
    // jsdom has no `elementFromPoint`; install a mock for the hover-driven
    // `overEdge` cases (mirrors the pattern in useGanttLink.spec.ts).
    let efp: Mock<(x: number, y: number) => Element | null>
    const original = Object.getOwnPropertyDescriptor(Document.prototype, 'elementFromPoint')

    beforeEach(() => {
      efp = vi.fn<(x: number, y: number) => Element | null>().mockReturnValue(null)
      document.elementFromPoint = efp as unknown as typeof document.elementFromPoint
    })

    afterEach(() => {
      if (original) Object.defineProperty(Document.prototype, 'elementFromPoint', original)
      else delete (document as Partial<Document>).elementFromPoint
      document.body.style.userSelect = ''
      document.body.style.cursor = ''
    })

    /** A synthetic drop-target host at a given horizontal half, for `targetAt`. */
    function hostEl(id: string, left: number, width: number): HTMLElement {
      const el = document.createElement('div')
      el.setAttribute('data-id', id)
      el.getBoundingClientRect = () =>
        ({
          left,
          width,
          top: 0,
          height: 20,
          right: left + width,
          bottom: 20,
          x: left,
          y: 0,
        }) as DOMRect
      return el
    }

    function mountWithSpy() {
      const shape = vi.fn<DependencyPathBuilder>(() => 'M-mock')
      const { wrapper, ctx } = mountInRoot(GanttDependencies, {
        rootProps: { rows, unit: 'day', linkable: true, dependencyShape: shape },
      })
      return { wrapper, ctx, shape }
    }

    it('create + finish anchor, no hover: default rightward (1,1) hints', async () => {
      const { wrapper, ctx, shape } = mountWithSpy()
      ctx().beginLink({
        anchorId: 'a',
        anchorEdge: 'finish',
        mode: 'create',
        pointer: { x: 500, y: 5 },
      })
      await nextTick()

      expect(wrapper.find('.gantt-dependency-draft').exists()).toBe(true)
      const [tail, head, hints] = shape.mock.calls[shape.mock.calls.length - 1]!
      expect(tail).toEqual({ x: ctx().dateToX('2026-01-05'), y: expect.any(Number) })
      expect(head).toEqual({ x: 500, y: 5 })
      expect(hints).toEqual({ tailDir: 1, headDir: 1 })
      ctx().endLink(null)
    })

    it('create + start anchor, no hover: tail leaves leftward', async () => {
      const { ctx, shape } = mountWithSpy()
      ctx().beginLink({
        anchorId: 'a',
        anchorEdge: 'start',
        mode: 'create',
        pointer: { x: 500, y: 5 },
      })
      await nextTick()

      const [tail, , hints] = shape.mock.calls[shape.mock.calls.length - 1]!
      expect(tail).toEqual({ x: ctx().dateToX('2026-01-01'), y: expect.any(Number) })
      expect(hints).toEqual({ tailDir: -1, headDir: 1 })
      ctx().endLink(null)
    })

    it('create + hover on the drop target\'s finish half: head entered leftward', async () => {
      const { ctx, shape } = mountWithSpy()
      ctx().beginLink({
        anchorId: 'a',
        anchorEdge: 'finish',
        mode: 'create',
        pointer: { x: 10, y: 5 },
      })
      efp.mockReturnValue(hostEl('c', 100, 60)) // midpoint 130
      window.dispatchEvent(new PointerEvent('pointermove', { clientX: 150, clientY: 5 }))
      await nextTick()

      expect(ctx().linkDraft.value?.overEdge).toBe('finish')
      const [, , hints] = shape.mock.calls[shape.mock.calls.length - 1]!
      expect(hints).toEqual({ tailDir: 1, headDir: -1 })
      ctx().endLink(null)
    })

    it('reroute-tail: the anchor is the head, the pointer drags the tail', async () => {
      const { ctx, shape } = mountWithSpy()
      ctx().beginLink({
        anchorId: 'b',
        anchorEdge: 'finish',
        mode: 'reroute-tail',
        link: { from: 'a', to: 'b' },
        pointer: { x: 10, y: 5 },
      })
      await nextTick()

      // No hover yet: tailDir defaults to 1; headDir follows the anchor edge.
      const [tail, head, hints] = shape.mock.calls[shape.mock.calls.length - 1]!
      expect(tail).toEqual({ x: 10, y: 5 })
      expect(head).toEqual({ x: ctx().dateToX('2026-01-10'), y: expect.any(Number) })
      expect(hints).toEqual({ tailDir: 1, headDir: -1 })
      ctx().endLink(null)
    })

    it('reroute-tail + hover on the drop target\'s start half: tail leaves leftward', async () => {
      const { ctx, shape } = mountWithSpy()
      ctx().beginLink({
        anchorId: 'b',
        anchorEdge: 'start',
        mode: 'reroute-tail',
        link: { from: 'a', to: 'b' },
        pointer: { x: 10, y: 5 },
      })
      efp.mockReturnValue(hostEl('c', 100, 60)) // midpoint 130
      window.dispatchEvent(new PointerEvent('pointermove', { clientX: 110, clientY: 5 }))
      await nextTick()

      expect(ctx().linkDraft.value?.overEdge).toBe('start')
      const [, , hints] = shape.mock.calls[shape.mock.calls.length - 1]!
      expect(hints).toEqual({ tailDir: -1, headDir: 1 })
      ctx().endLink(null)
    })
  })

  it('exposes a scoped slot carrying the computed links', () => {
    const { wrapper } = mountInRoot(GanttDependencies, {
      rootProps: { rows, unit: 'day' },
      slots: {
        default: ({ links }: { links: { key: string }[] }) =>
          h('text', { class: 'count' }, String(links.length)),
      },
    })
    expect(wrapper.find('.count').text()).toBe('1')
  })
})
