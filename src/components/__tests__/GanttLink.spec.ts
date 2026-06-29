import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import Gantt from '../Gantt.vue'
import GanttDependencies from '../GanttDependencies.vue'
import { mountInRoot } from '../../__tests__/helpers'
import type { GanttDependencyChange, GanttDependencyUpdate } from '../../types'

const rows = [
  { id: 'r1', tasks: [{ id: 'a', start: '2026-01-01', end: '2026-01-05' }] },
  { id: 'r2', tasks: [{ id: 'b', start: '2026-01-06', end: '2026-01-10', dependencies: ['a'] }] },
  { id: 'r3', tasks: [{ id: 'c', start: '2026-01-11', end: '2026-01-15' }] },
]

describe('dependency removal (click an arrow)', () => {
  it('emits dependency-remove (and dependency-click) when linkable', async () => {
    const wrapper = mount(Gantt, { props: { rows, unit: 'day', columnWidth: 40, linkable: true } })
    await wrapper.find('.gantt-dependency').trigger('click')
    const removed = wrapper.emitted('dependency-remove')![0]![0] as GanttDependencyChange
    expect(removed).toEqual({ from: 'a', to: 'b' })
    expect(wrapper.emitted('dependency-click')).toHaveLength(1)
  })

  it('does not emit dependency-remove when not linkable', async () => {
    const wrapper = mount(Gantt, { props: { rows, unit: 'day', columnWidth: 40 } })
    await wrapper.find('.gantt-dependency').trigger('click')
    expect(wrapper.emitted('dependency-remove')).toBeUndefined()
  })
})

describe('dependency create / re-route (link drag)', () => {
  it('beginLink(create) + endLink(target) emits dependency-create', () => {
    const { wrapper, ctx } = mountInRoot(GanttDependencies, {
      rootProps: { rows, unit: 'day', linkable: true },
    })
    ctx().beginLink({
      anchorId: 'a',
      anchorEdge: 'finish',
      mode: 'create',
      pointer: { x: 0, y: 0 },
    })
    ctx().endLink('c')
    expect(wrapper.emitted('dependency-create')![0]![0]).toEqual({ from: 'a', to: 'c' })
  })

  it('ignores a duplicate / self create', () => {
    const { wrapper, ctx } = mountInRoot(GanttDependencies, {
      rootProps: { rows, unit: 'day', linkable: true },
    })
    ctx().beginLink({
      anchorId: 'a',
      anchorEdge: 'finish',
      mode: 'create',
      pointer: { x: 0, y: 0 },
    })
    ctx().endLink('b') // b already depends on a
    ctx().beginLink({
      anchorId: 'a',
      anchorEdge: 'finish',
      mode: 'create',
      pointer: { x: 0, y: 0 },
    })
    ctx().endLink('a') // self
    expect(wrapper.emitted('dependency-create')).toBeUndefined()
  })

  it('reroute-head emits dependency-update carrying the previous link', () => {
    const { wrapper, ctx } = mountInRoot(GanttDependencies, {
      rootProps: { rows, unit: 'day', linkable: true },
    })
    ctx().beginLink({
      anchorId: 'a',
      anchorEdge: 'finish',
      mode: 'reroute-head',
      link: { from: 'a', to: 'b' },
      pointer: { x: 0, y: 0 },
    })
    ctx().endLink('c')
    const update = wrapper.emitted('dependency-update')![0]![0] as GanttDependencyUpdate
    expect(update).toEqual({ from: 'a', to: 'c', previous: { from: 'a', to: 'b' } })
  })

  it('endLink(null) cancels without emitting', () => {
    const { wrapper, ctx } = mountInRoot(GanttDependencies, {
      rootProps: { rows, unit: 'day', linkable: true },
    })
    ctx().beginLink({
      anchorId: 'a',
      anchorEdge: 'finish',
      mode: 'create',
      pointer: { x: 0, y: 0 },
    })
    ctx().endLink(null)
    expect(wrapper.emitted('dependency-create')).toBeUndefined()
  })
})
