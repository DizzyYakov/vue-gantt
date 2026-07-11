import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import Gantt from '../Gantt.vue'
import type { GanttRowData } from '../../index'
import type { GanttRowEvent } from '../../types'

// Accessible sidebar (a11y slice 4, opt-in via `keyboard`): tree/list container
// role, per-row treeitem/listitem role + aria, roving tabindex across rows
// (Up/Down/Home/End), Left/Right expand/collapse, Enter/Space activation.

const flatRows: GanttRowData[] = [
  { id: 'r1', name: 'R1', tasks: [{ id: 'a', name: 'A', start: '2026-01-01', end: '2026-01-05' }] },
  { id: 'r2', name: 'R2', tasks: [{ id: 'b', name: 'B', start: '2026-01-03', end: '2026-01-06' }] },
  { id: 'r3', name: 'R3', tasks: [{ id: 'c', name: 'C', start: '2026-01-05', end: '2026-01-08' }] },
]

// A parent with two children, in pre-order (like `GanttTree.spec.ts`).
const treeRows: GanttRowData[] = [
  { id: 'p', name: 'Parent', tasks: [{ id: 'pt', start: '2026-06-10', end: '2026-06-12' }] },
  { id: 'c1', name: 'Child 1', parentId: 'p', tasks: [{ id: 'c1t', start: '2026-06-01', end: '2026-06-05' }] },
  { id: 'c2', name: 'Child 2', parentId: 'p', tasks: [{ id: 'c2t', start: '2026-06-06', end: '2026-06-08' }] },
]

const mountFlat = (extraProps: Record<string, unknown> = {}) =>
  mount(Gantt, { props: { rows: flatRows, unit: 'day', columnWidth: 40, keyboard: true, ...extraProps } })

const mountTree = (extraProps: Record<string, unknown> = {}) =>
  mount(Gantt, { props: { rows: treeRows, unit: 'day', columnWidth: 40, keyboard: true, ...extraProps } })

/** Map of row id -> its `.gantt-task-list__row`'s rendered `tabindex` attribute. */
function rowTabIndexById(wrapper: ReturnType<typeof mountFlat>): Record<string, string | undefined> {
  const out: Record<string, string | undefined> = {}
  for (const row of wrapper.findAll('.gantt-task-list__row')) {
    const id = row.attributes('data-id')
    if (id) out[id] = row.attributes('tabindex')
  }
  return out
}

describe('accessible sidebar (opt-in via `keyboard`)', () => {
  describe('container + row roles', () => {
    it('marks a flat sidebar as a list of listitems', () => {
      const wrapper = mountFlat()

      expect(wrapper.find('.gantt-task-list').attributes('role')).toBe('list')
      const row = wrapper.find('.gantt-task-list__row[data-id="r1"]')
      expect(row.attributes('role')).toBe('listitem')
      expect(row.attributes('aria-level')).toBeUndefined()
      expect(row.attributes('aria-expanded')).toBeUndefined()
    })

    it('marks a tree sidebar (parentId rows) as a tree of treeitems with level + expanded state', () => {
      const wrapper = mountTree()

      expect(wrapper.find('.gantt-task-list').attributes('role')).toBe('tree')

      const parent = wrapper.find('.gantt-task-list__row[data-id="p"]')
      expect(parent.attributes('role')).toBe('treeitem')
      expect(parent.attributes('aria-level')).toBe('1')
      expect(parent.attributes('aria-expanded')).toBe('true')

      const child = wrapper.find('.gantt-task-list__row[data-id="c1"]')
      expect(child.attributes('role')).toBe('treeitem')
      expect(child.attributes('aria-level')).toBe('2')
      // Leaf rows have no expanded state at all.
      expect(child.attributes('aria-expanded')).toBeUndefined()
    })
  })

  describe('roving tabindex', () => {
    it('gives exactly one row tabindex=0 (the first visible, by default) and -1 to the rest', () => {
      const wrapper = mountFlat()

      expect(rowTabIndexById(wrapper)).toEqual({ r1: '0', r2: '-1', r3: '-1' })
      expect(wrapper.find('.gantt-task-list__row[data-id="r1"]').attributes('aria-selected')).toBe('true')
      expect(wrapper.find('.gantt-task-list__row[data-id="r2"]').attributes('aria-selected')).toBe('false')
    })

    it('moves the roving anchor to whichever row receives focus', async () => {
      const wrapper = mountFlat()

      await wrapper.find('.gantt-task-list__row[data-id="r3"]').trigger('focus')

      expect(rowTabIndexById(wrapper)).toEqual({ r1: '-1', r2: '-1', r3: '0' })
      expect(wrapper.find('.gantt-task-list__row[data-id="r3"]').attributes('aria-selected')).toBe('true')
    })

    it('moves the roving anchor down/up on ArrowDown/ArrowUp', async () => {
      const wrapper = mountFlat()
      const row1 = wrapper.find('.gantt-task-list__row[data-id="r1"]')

      row1.element.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }))
      await wrapper.vm.$nextTick()
      expect(rowTabIndexById(wrapper)).toEqual({ r1: '-1', r2: '0', r3: '-1' })

      const row2 = wrapper.find('.gantt-task-list__row[data-id="r2"]')
      row2.element.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowUp', bubbles: true }))
      await wrapper.vm.$nextTick()
      expect(rowTabIndexById(wrapper)).toEqual({ r1: '0', r2: '-1', r3: '-1' })
    })
  })

  describe('tree expand/collapse (ArrowRight / ArrowLeft)', () => {
    it('ArrowRight on a collapsed parent row expands its subtree', async () => {
      const collapsedRows = [{ ...treeRows[0]!, collapsed: true }, treeRows[1]!, treeRows[2]!]
      const wrapper = mount(Gantt, { props: { rows: collapsedRows, unit: 'day', keyboard: true } })
      // Collapsed: only the parent row is visible.
      expect(wrapper.findAll('.gantt-task-list__row').map(r => r.attributes('data-id'))).toEqual(['p'])

      const parent = wrapper.find('.gantt-task-list__row[data-id="p"]')
      parent.element.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }))
      await wrapper.vm.$nextTick()

      expect(wrapper.findAll('.gantt-task-list__row').map(r => r.attributes('data-id'))).toEqual(['p', 'c1', 'c2'])
      expect(wrapper.emitted('row-toggle')![0]![0]).toEqual({ id: 'p', collapsed: false })
      expect(parent.attributes('aria-expanded')).toBe('true')
    })

    it('ArrowLeft on an expanded parent row collapses its subtree', async () => {
      const wrapper = mountTree()
      expect(wrapper.findAll('.gantt-task-list__row')).toHaveLength(3)

      const parent = wrapper.find('.gantt-task-list__row[data-id="p"]')
      parent.element.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowLeft', bubbles: true }))
      await wrapper.vm.$nextTick()

      expect(wrapper.findAll('.gantt-task-list__row').map(r => r.attributes('data-id'))).toEqual(['p'])
      expect(wrapper.emitted('row-toggle')![0]![0]).toEqual({ id: 'p', collapsed: true })
      expect(parent.attributes('aria-expanded')).toBe('false')
    })
  })

  describe('activation (Enter / Space)', () => {
    it('emits row-click exactly once on Enter', async () => {
      const wrapper = mountFlat()
      const row = wrapper.find('.gantt-task-list__row[data-id="r1"]')

      row.element.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }))
      await wrapper.vm.$nextTick()

      expect(wrapper.emitted('row-click')).toHaveLength(1)
      expect((wrapper.emitted('row-click')![0]![0] as GanttRowEvent).row.id).toBe('r1')
    })
  })

  describe('keyboard: false (default)', () => {
    it('renders no role/tabindex/aria on the container or rows', () => {
      const wrapper = mountFlat({ keyboard: false })

      expect(wrapper.find('.gantt-task-list').attributes('role')).toBeUndefined()
      const row = wrapper.find('.gantt-task-list__row[data-id="r1"]')
      expect(row.attributes('role')).toBeUndefined()
      expect(row.attributes('tabindex')).toBeUndefined()
      expect(row.attributes('aria-selected')).toBeUndefined()
      expect(row.attributes('aria-level')).toBeUndefined()
      expect(row.attributes('aria-expanded')).toBeUndefined()
    })

    it('ignores arrow keys — no anchor move, no emit', async () => {
      const wrapper = mountFlat({ keyboard: false })
      const row = wrapper.find('.gantt-task-list__row[data-id="r1"]')

      row.element.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }))
      await wrapper.vm.$nextTick()

      expect(wrapper.emitted('row-toggle')).toBeUndefined()
      expect(rowTabIndexById(wrapper)).toEqual({ r1: undefined, r2: undefined, r3: undefined })
    })
  })
})
