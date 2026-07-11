import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import Gantt from '../Gantt.vue'
import type { GanttRowData } from '../../index'
import type { GanttTaskEvent } from '../../types'

const rows: GanttRowData[] = [
  { id: 'r1', name: 'R1', tasks: [{ id: 'a', name: 'A', start: '2026-01-01', end: '2026-01-05' }] },
  {
    id: 'r2',
    name: 'R2',
    tasks: [{ id: 'm', name: 'M', type: 'milestone', start: '2026-01-12' }],
  },
]

const mountChart = (extraProps: Record<string, unknown> = {}) =>
  mount(Gantt, {
    props: { rows, unit: 'day', columnWidth: 40, today: '2026-01-03', ...extraProps },
  })

describe('accessibility (opt-in via `keyboard`)', () => {
  describe('keyboard: true', () => {
    it('gives the task bar a button role, tabindex and a descriptive aria-label', () => {
      const wrapper = mountChart({ keyboard: true })
      const bar = wrapper.find('.gantt-bar[data-id="a"]')

      expect(bar.attributes('role')).toBe('button')
      expect(bar.attributes('tabindex')).toBe('0')
      const label = bar.attributes('aria-label')
      expect(label).toContain('A')
      expect(label).toContain('complete')
    })

    it('gives the milestone marker a button role, tabindex and a descriptive aria-label', () => {
      const wrapper = mountChart({ keyboard: true })
      const marker = wrapper.find('.gantt-milestone__marker')

      expect(marker.attributes('role')).toBe('button')
      expect(marker.attributes('tabindex')).toBe('0')
      const label = marker.attributes('aria-label')
      expect(label).toContain('M')
      expect(label).toContain('(milestone)')
    })

    it('activates the task bar with Enter and with Space', async () => {
      const wrapper = mountChart({ keyboard: true })
      const bar = wrapper.find('.gantt-bar[data-id="a"]')

      bar.element.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }))
      await wrapper.vm.$nextTick()
      expect(wrapper.emitted('task-click')).toHaveLength(1)
      expect((wrapper.emitted('task-click')![0]![0] as GanttTaskEvent).task.id).toBe('a')

      bar.element.dispatchEvent(new KeyboardEvent('keydown', { key: ' ', bubbles: true }))
      await wrapper.vm.$nextTick()
      expect(wrapper.emitted('task-click')).toHaveLength(2)
    })

    it('activates the milestone marker with Enter', async () => {
      const wrapper = mountChart({ keyboard: true })
      const marker = wrapper.find('.gantt-milestone__marker')

      marker.element.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }))
      await wrapper.vm.$nextTick()
      expect(wrapper.emitted('milestone-click')).toHaveLength(1)
      expect((wrapper.emitted('milestone-click')![0]![0] as GanttTaskEvent).task.id).toBe('m')
    })

    it('ignores other keys (no emit, no preventDefault)', async () => {
      const wrapper = mountChart({ keyboard: true })
      const bar = wrapper.find('.gantt-bar[data-id="a"]')

      const otherKey = new KeyboardEvent('keydown', { key: 'a', bubbles: true, cancelable: true })
      bar.element.dispatchEvent(otherKey)
      await wrapper.vm.$nextTick()
      expect(wrapper.emitted('task-click')).toBeUndefined()
      expect(otherKey.defaultPrevented).toBe(false)

      const arrowKey = new KeyboardEvent('keydown', {
        key: 'ArrowRight',
        bubbles: true,
        cancelable: true,
      })
      bar.element.dispatchEvent(arrowKey)
      await wrapper.vm.$nextTick()
      expect(wrapper.emitted('task-click')).toBeUndefined()
      expect(arrowKey.defaultPrevented).toBe(false)
    })
  })

  describe('keyboard: false (default)', () => {
    it('renders no role/tabindex/aria-label on the task bar or milestone marker', () => {
      const wrapper = mountChart()
      const bar = wrapper.find('.gantt-bar[data-id="a"]')
      const marker = wrapper.find('.gantt-milestone__marker')

      expect(bar.attributes('role')).toBeUndefined()
      expect(bar.attributes('tabindex')).toBeUndefined()
      expect(bar.attributes('aria-label')).toBeUndefined()
      expect(marker.attributes('role')).toBeUndefined()
      expect(marker.attributes('tabindex')).toBeUndefined()
      expect(marker.attributes('aria-label')).toBeUndefined()
    })

    it('does not emit task-click on Enter', async () => {
      const wrapper = mountChart()
      const bar = wrapper.find('.gantt-bar[data-id="a"]')

      bar.element.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }))
      await wrapper.vm.$nextTick()
      expect(wrapper.emitted('task-click')).toBeUndefined()
    })

    it('renders no role/aria-label on the root', () => {
      const wrapper = mountChart()
      const root = wrapper.find('.gantt-root')

      expect(root.attributes('role')).toBeUndefined()
      expect(root.attributes('aria-label')).toBeUndefined()
    })
  })

  describe('root group role/label', () => {
    it('marks the root as a group with the default aria-label when keyboard is on', () => {
      const wrapper = mountChart({ keyboard: true })
      const root = wrapper.find('.gantt-root')

      expect(root.attributes('role')).toBe('group')
      expect(root.attributes('aria-label')).toBe('Gantt chart')
    })

    it('reflects a custom ariaLabel', () => {
      const wrapper = mountChart({ keyboard: true, ariaLabel: 'My schedule' })
      const root = wrapper.find('.gantt-root')

      expect(root.attributes('aria-label')).toBe('My schedule')
    })
  })
})
