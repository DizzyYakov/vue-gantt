import { describe, expect, it, vi } from 'vitest'
import { useGanttGroups, type GroupsOptions } from '../useGanttGroups'
import type { GanttGroup } from '../../types'

// Pure composable (no Vue context) — drive it directly, like `useGanttLink.spec.ts`.

function makeGroups(groups: GanttGroup[], overrides: Partial<GroupsOptions> = {}) {
  const onToggle = vi.fn<(event: { id: string; collapsed: boolean }) => void>()
  const api = useGanttGroups({
    sourceGroups: () => groups,
    onToggle,
    ...overrides,
  })
  return { api, onToggle }
}

describe('useGanttGroups', () => {
  it('groupMeta defaults collapsed from the group definition', () => {
    const { api } = makeGroups([
      { id: 'a', name: 'Alpha', collapsed: true },
      { id: 'b', name: 'Beta' },
    ])

    expect(api.groupMeta.value.get('a')).toEqual({ name: 'Alpha', collapsed: true, meta: {} })
    expect(api.groupMeta.value.get('b')).toEqual({ name: 'Beta', collapsed: false, meta: {} })
  })

  it('toggleGroup overrides the default and calls onToggle with the new state', () => {
    const { api, onToggle } = makeGroups([{ id: 'a', name: 'Alpha', collapsed: false }])

    api.toggleGroup('a')

    expect(onToggle).toHaveBeenCalledWith({ id: 'a', collapsed: true })
    expect(api.groupMeta.value.get('a')?.collapsed).toBe(true)
  })

  it('toggling twice returns to the original state', () => {
    const { api, onToggle } = makeGroups([{ id: 'a', name: 'Alpha', collapsed: false }])

    api.toggleGroup('a')
    api.toggleGroup('a')

    expect(onToggle).toHaveBeenNthCalledWith(1, { id: 'a', collapsed: true })
    expect(onToggle).toHaveBeenNthCalledWith(2, { id: 'a', collapsed: false })
    expect(api.groupMeta.value.get('a')?.collapsed).toBe(false)
  })

  it('falls back to the id as the name and {} as meta when absent', () => {
    const { api } = makeGroups([{ id: 'solo' }])

    expect(api.groupMeta.value.get('solo')).toEqual({ name: 'solo', collapsed: false, meta: {} })
  })
})
