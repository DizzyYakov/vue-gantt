import { describe, expect, it, vi } from 'vitest'
import { useGanttRows, type RowsOptions } from '../useGanttRows'
import type { GanttRow } from '../../types'

// Pure composable (no Vue context) — drive it directly, like `useGanttGroups.spec.ts`.

function makeRows(rows: GanttRow[], overrides: Partial<RowsOptions> = {}) {
  const onToggle = vi.fn<(event: { id: string; collapsed: boolean }) => void>()
  const api = useGanttRows({
    sourceRows: () => rows,
    onToggle,
    ...overrides,
  })
  return { api, onToggle }
}

describe('useGanttRows', () => {
  it('rowCollapse defaults from each row definition', () => {
    const { api } = makeRows([
      { id: 'a', collapsed: true },
      { id: 'b' },
    ])

    expect(api.rowCollapse.value.get('a')).toBe(true)
    expect(api.rowCollapse.value.get('b')).toBe(false)
  })

  it('toggleRow overrides the default and calls onToggle with the new state', () => {
    const { api, onToggle } = makeRows([{ id: 'a', collapsed: false }])

    api.toggleRow('a')

    expect(onToggle).toHaveBeenCalledWith({ id: 'a', collapsed: true })
    expect(api.rowCollapse.value.get('a')).toBe(true)
  })

  it('toggling twice returns to the original state', () => {
    const { api, onToggle } = makeRows([{ id: 'a', collapsed: false }])

    api.toggleRow('a')
    api.toggleRow('a')

    expect(onToggle).toHaveBeenNthCalledWith(1, { id: 'a', collapsed: true })
    expect(onToggle).toHaveBeenNthCalledWith(2, { id: 'a', collapsed: false })
    expect(api.rowCollapse.value.get('a')).toBe(false)
  })

  it('a user toggle survives re-renders (override wins over the default)', () => {
    const rows: GanttRow[] = [{ id: 'a', collapsed: true }]
    const { api } = makeRows(rows)

    api.toggleRow('a') // expand, overriding the collapsed default

    expect(api.rowCollapse.value.get('a')).toBe(false)
  })
})
