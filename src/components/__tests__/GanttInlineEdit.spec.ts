import { mount } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { h, nextTick } from 'vue'
import Gantt from '../Gantt.vue'
import type { GanttRow, GanttRowEditEvent, GanttTaskEditEvent } from '../../types'

// A single row `r1` ("Backend") with one task `a` ("Alpha").
function makeRows(): GanttRow[] {
  return [
    {
      id: 'r1',
      name: 'Backend',
      tasks: [{ id: 'a', name: 'Alpha', start: '2026-01-01', end: '2026-01-05' }],
    },
  ]
}

describe('GanttInlineEdit — row rename (sidebar)', () => {
  it('dbl-click opens an input, Enter commits row-edit + update:rows, input closes', async () => {
    // arrange
    const wrapper = mount(Gantt, { props: { rows: makeRows(), editable: true } })
    const row = wrapper.find('.gantt-task-list__row[data-id="r1"]')

    // act — open the editor
    await row.trigger('dblclick')
    const input = row.find('input.gantt-edit-input')
    expect(input.exists()).toBe(true)

    // act — type a new name + commit
    await input.setValue('Backend v2')
    await input.trigger('keydown.enter')

    // assert — the edit event carries the id + patch
    const edits = wrapper.emitted('row-edit')
    expect(edits).toHaveLength(1)
    expect((edits![0]![0] as GanttRowEditEvent)).toMatchObject({
      id: 'r1',
      patch: { name: 'Backend v2' },
    })

    // assert — the v-model update contains the renamed row
    const model = wrapper.emitted('update:rows')
    expect(model).toBeTruthy()
    const lastRows = model![model!.length - 1]![0] as GanttRow[]
    expect(lastRows.find(r => r.id === 'r1')?.name).toBe('Backend v2')

    // assert — the editor closed
    expect(row.find('input.gantt-edit-input').exists()).toBe(false)
  })

  it('Esc cancels: no row-edit, input closes, name unchanged', async () => {
    const wrapper = mount(Gantt, { props: { rows: makeRows(), editable: true } })
    const row = wrapper.find('.gantt-task-list__row[data-id="r1"]')

    await row.trigger('dblclick')
    const input = row.find('input.gantt-edit-input')
    await input.setValue('Zzz')
    await input.trigger('keydown.esc')

    expect(wrapper.emitted('row-edit')).toBeUndefined()
    expect(row.find('input.gantt-edit-input').exists()).toBe(false)
    expect(row.find('.gantt-task-list__name').text()).toBe('Backend')
  })

  it('does not commit a whitespace-only or unchanged name', async () => {
    const wrapper = mount(Gantt, { props: { rows: makeRows(), editable: true } })
    const row = wrapper.find('.gantt-task-list__row[data-id="r1"]')

    // whitespace-only → rejected by the trim validation
    await row.trigger('dblclick')
    let input = row.find('input.gantt-edit-input')
    await input.setValue('   ')
    await input.trigger('keydown.enter')
    expect(wrapper.emitted('row-edit')).toBeUndefined()

    // unchanged → no edit either
    await row.trigger('dblclick')
    input = row.find('input.gantt-edit-input')
    await input.trigger('keydown.enter')
    expect(wrapper.emitted('row-edit')).toBeUndefined()
  })
})

describe('GanttInlineEdit — task rename (bar)', () => {
  it('dbl-click opens an input, Enter commits task-edit', async () => {
    const wrapper = mount(Gantt, { props: { rows: makeRows(), editable: true } })
    const bar = wrapper.find('.gantt-bar[data-id="a"]')

    await bar.trigger('dblclick')
    const input = bar.find('input.gantt-edit-input')
    expect(input.exists()).toBe(true)

    await input.setValue('Alpha v2')
    await input.trigger('keydown.enter')

    const edits = wrapper.emitted('task-edit')
    expect(edits).toHaveLength(1)
    expect((edits![0]![0] as GanttTaskEditEvent)).toMatchObject({
      id: 'a',
      patch: { name: 'Alpha v2' },
    })
  })

  it('Esc cancels: no task-edit, input closes, label unchanged', async () => {
    const wrapper = mount(Gantt, { props: { rows: makeRows(), editable: true } })
    const bar = wrapper.find('.gantt-bar[data-id="a"]')

    await bar.trigger('dblclick')
    const input = bar.find('input.gantt-edit-input')
    await input.setValue('Zzz')
    await input.trigger('keydown.esc')

    expect(wrapper.emitted('task-edit')).toBeUndefined()
    expect(bar.find('input.gantt-edit-input').exists()).toBe(false)
    expect(bar.find('.gantt-bar__label').text()).toBe('Alpha')
  })
})

describe('GanttInlineEdit — touch long-press (no dblclick on touch)', () => {
  beforeEach(() => vi.useFakeTimers())
  afterEach(() => vi.useRealTimers())

  it('a long-press opens the row editor', async () => {
    const wrapper = mount(Gantt, { props: { rows: makeRows(), editable: true } })
    const row = wrapper.find('.gantt-task-list__row[data-id="r1"]')

    await row.trigger('pointerdown', { pointerType: 'touch' })
    vi.advanceTimersByTime(500)
    await nextTick()

    expect(row.find('input.gantt-edit-input').exists()).toBe(true)
  })

  it('a long-press opens the bar editor', async () => {
    const wrapper = mount(Gantt, { props: { rows: makeRows(), editable: true } })
    const bar = wrapper.find('.gantt-bar[data-id="a"]')

    await bar.trigger('pointerdown', { pointerType: 'touch' })
    vi.advanceTimersByTime(500)
    await nextTick()

    expect(bar.find('input.gantt-edit-input').exists()).toBe(true)
  })

  it('a quick tap (released before the delay) does not open the editor', async () => {
    const wrapper = mount(Gantt, { props: { rows: makeRows(), editable: true } })
    const row = wrapper.find('.gantt-task-list__row[data-id="r1"]')

    await row.trigger('pointerdown', { pointerType: 'touch' })
    await row.trigger('pointerup')
    vi.advanceTimersByTime(500)
    await nextTick()

    expect(row.find('input.gantt-edit-input').exists()).toBe(false)
  })
})

describe('GanttInlineEdit — disabled without `editable`', () => {
  it('dbl-click on a row does not open an input but still emits row-dblclick', async () => {
    const wrapper = mount(Gantt, { props: { rows: makeRows() } })
    const row = wrapper.find('.gantt-task-list__row[data-id="r1"]')

    await row.trigger('dblclick')

    expect(row.find('input.gantt-edit-input').exists()).toBe(false)
    expect(wrapper.emitted('row-dblclick')).toHaveLength(1)
  })

  it('dbl-click on a bar does not open an input but still emits task-dblclick', async () => {
    const wrapper = mount(Gantt, { props: { rows: makeRows() } })
    const bar = wrapper.find('.gantt-bar[data-id="a"]')

    await bar.trigger('dblclick')

    expect(bar.find('input.gantt-edit-input').exists()).toBe(false)
    expect(wrapper.emitted('task-dblclick')).toHaveLength(1)
  })
})

describe('GanttInlineEdit — custom editor slots', () => {
  it('rowEditor slot replaces the input; its commit(value) emits row-edit', async () => {
    const wrapper = mount(Gantt, {
      props: { rows: makeRows(), editable: true },
      slots: {
        rowEditor: (slotProps: {
          value: string
          commit: (v: string) => void
          cancel: () => void
        }) =>
          h(
            'button',
            {
              class: 'custom-row-editor',
              'data-value': slotProps.value,
              onClick: () => slotProps.commit('From slot'),
            },
            'commit',
          ),
      },
    })
    const row = wrapper.find('.gantt-task-list__row[data-id="r1"]')

    await row.trigger('dblclick')
    // The built-in input is replaced by the custom content, seeded with the value.
    expect(row.find('input.gantt-edit-input').exists()).toBe(false)
    const editor = row.find('.custom-row-editor')
    expect(editor.exists()).toBe(true)
    expect(editor.attributes('data-value')).toBe('Backend')

    await editor.trigger('click')

    const edits = wrapper.emitted('row-edit')
    expect(edits).toHaveLength(1)
    expect((edits![0]![0] as GanttRowEditEvent)).toMatchObject({
      id: 'r1',
      patch: { name: 'From slot' },
    })
  })

  it('taskEditor slot replaces the input; its commit(value) emits task-edit', async () => {
    const wrapper = mount(Gantt, {
      props: { rows: makeRows(), editable: true },
      slots: {
        taskEditor: (slotProps: {
          value: string
          commit: (v: string) => void
          cancel: () => void
        }) =>
          h(
            'button',
            {
              class: 'custom-task-editor',
              'data-value': slotProps.value,
              onClick: () => slotProps.commit('Slotted task'),
            },
            'commit',
          ),
      },
    })
    const bar = wrapper.find('.gantt-bar[data-id="a"]')

    await bar.trigger('dblclick')
    expect(bar.find('input.gantt-edit-input').exists()).toBe(false)
    const editor = bar.find('.custom-task-editor')
    expect(editor.exists()).toBe(true)
    expect(editor.attributes('data-value')).toBe('Alpha')

    await editor.trigger('click')

    const edits = wrapper.emitted('task-edit')
    expect(edits).toHaveLength(1)
    expect((edits![0]![0] as GanttTaskEditEvent)).toMatchObject({
      id: 'a',
      patch: { name: 'Slotted task' },
    })
  })

  it('taskEditor slot cancel() closes the editor without emitting', async () => {
    const wrapper = mount(Gantt, {
      props: { rows: makeRows(), editable: true },
      slots: {
        taskEditor: (slotProps: { cancel: () => void }) =>
          h(
            'button',
            { class: 'custom-task-editor', onClick: () => slotProps.cancel() },
            'cancel',
          ),
      },
    })
    const bar = wrapper.find('.gantt-bar[data-id="a"]')

    await bar.trigger('dblclick')
    await bar.find('.custom-task-editor').trigger('click')

    expect(wrapper.emitted('task-edit')).toBeUndefined()
    expect(bar.find('.custom-task-editor').exists()).toBe(false)
  })
})
