import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import { h } from 'vue'
import Gantt from '../Gantt.vue'
import type { GanttResource, GanttRow, ResolvedResource } from '../../types'
import { mountInRoot } from '../../__tests__/helpers'

const resources: GanttResource[] = [
  { id: 'u1', name: 'Ada', color: '#f00' },
  { id: 'u2' }, // no name → defaults to id
]

const rows: GanttRow[] = [
  {
    id: 'r1',
    name: 'Backend',
    tasks: [
      { id: 'a', name: 'Alpha', start: '2026-01-01', end: '2026-01-05', resourceIds: ['u1', 'u2'] },
      { id: 'b', name: 'Beta', start: '2026-01-05', end: '2026-01-10', resourceIds: ['u1', 'ghost'] },
      { id: 'c', name: 'Gamma', start: '2026-01-10', end: '2026-01-12' },
      { id: 'm', name: 'Mark', type: 'milestone', start: '2026-01-12', resourceIds: ['u2'] },
    ],
  },
]

describe('resources (context resolution)', () => {
  it('resolves ctx.resources with name defaulted to id, color/meta preserved', () => {
    const { ctx } = mountInRoot(
      { setup: () => () => null },
      { rootProps: { rows: [{ id: 'r', tasks: [] }], resources } },
    )
    expect(ctx().resources.value).toEqual<ResolvedResource[]>([
      { id: 'u1', name: 'Ada', color: '#f00', meta: {} },
      { id: 'u2', name: 'u2', color: undefined, meta: {} },
    ])
  })

  it('ctx.resources is empty when the `resources` prop is absent', () => {
    const { ctx } = mountInRoot(
      { setup: () => () => null },
      { rootProps: { rows: [{ id: 'r', tasks: [] }] } },
    )
    expect(ctx().resources.value).toEqual([])
  })

  it('ctx.resourcesFor resolves a task\'s resourceIds, dropping unknown ids, in order', () => {
    const { ctx } = mountInRoot(
      { setup: () => () => null },
      { rootProps: { rows, resources } },
    )
    const [a, b, c] = ctx().tasks.value
    expect(ctx().resourcesFor(a!).map(r => r.id)).toEqual(['u1', 'u2'])
    // 'ghost' is not a known resource id → dropped, only 'u1' resolves.
    expect(ctx().resourcesFor(b!).map(r => r.id)).toEqual(['u1'])
    // No resourceIds at all → empty.
    expect(ctx().resourcesFor(c!)).toEqual([])
  })
})

describe('resources (bar/milestone slot scope)', () => {
  it('the #bar slot receives resolved `resources` for its assigned resourceIds', () => {
    let seen: string[][] = []
    mount(Gantt, {
      props: { rows, resources, unit: 'day' },
      slots: {
        bar: (props: { task: unknown; resources: unknown }) => {
          const task = props.task as { id: string }
          const resolved = props.resources as ResolvedResource[]
          if (task.id === 'a') seen = [resolved.map(r => r.id)]
          return h('span', { class: 'probe-bar' })
        },
      },
    })
    expect(seen).toEqual([['u1', 'u2']])
  })

  it('drops an unknown resource id and resolves the rest', () => {
    let seen: string[] | undefined
    mount(Gantt, {
      props: { rows, resources, unit: 'day' },
      slots: {
        bar: (props: { task: unknown; resources: unknown }) => {
          const task = props.task as { id: string }
          const resolved = props.resources as ResolvedResource[]
          if (task.id === 'b') seen = resolved.map(r => r.id)
          return h('span', { class: 'probe-bar' })
        },
      },
    })
    expect(seen).toEqual(['u1'])
  })

  it('a task without resourceIds gets an empty `resources` array', () => {
    let seen: unknown
    mount(Gantt, {
      props: { rows, resources, unit: 'day' },
      slots: {
        bar: (props: { task: unknown; resources: unknown }) => {
          const task = props.task as { id: string }
          if (task.id === 'c') seen = props.resources
          return h('span', { class: 'probe-bar' })
        },
      },
    })
    expect(seen).toEqual([])
  })

  it('the #milestone slot also receives resolved `resources`', () => {
    let seen: string[] | undefined
    mount(Gantt, {
      props: { rows, resources, unit: 'day' },
      slots: {
        milestone: (props: { task: unknown; resources: unknown }) => {
          const resolved = props.resources as ResolvedResource[]
          seen = resolved.map(r => r.id)
          return h('span', { class: 'probe-milestone' })
        },
      },
    })
    expect(seen).toEqual(['u2'])
  })

  it('without a `resources` prop, the slots still get an empty `resources` array (no throw)', () => {
    let barResources: unknown
    let milestoneResources: unknown
    expect(() =>
      mount(Gantt, {
        props: { rows, unit: 'day' },
        slots: {
          bar: (props: { task: unknown; resources: unknown }) => {
            const task = props.task as { id: string }
            if (task.id === 'a') barResources = props.resources
            return h('span', { class: 'probe-bar' })
          },
          milestone: (props: { task: unknown; resources: unknown }) => {
            milestoneResources = props.resources
            return h('span', { class: 'probe-milestone' })
          },
        },
      }),
    ).not.toThrow()
    expect(barResources).toEqual([])
    expect(milestoneResources).toEqual([])
  })
})
