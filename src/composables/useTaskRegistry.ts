import { computed, onUnmounted, reactive, watch, type MaybeRefOrGetter, toValue } from 'vue'
import { useGanttContext } from './useGanttContext'
import type { GanttGroup, GanttRow, GanttTask } from '../types'

/**
 * Reactive store of declaratively-declared groups, rows and tasks, owned by
 * `GanttRoot`. `Map` preserves insertion order, so rows/groups follow
 * declaration order. Tasks register against a row id and are merged back into
 * their row; groups are returned as a flat metadata list.
 */
export function useGanttRegistry() {
  const groups = reactive(new Map<string, GanttGroup>())
  const rows = reactive(new Map<string, GanttRow>())
  const tasks = reactive(new Map<string, { task: GanttTask; rowId: string }>())

  function registerGroup(group: GanttGroup): void {
    groups.set(group.id, group)
  }
  function unregisterGroup(id: string): void {
    groups.delete(id)
  }
  function registerRow(row: GanttRow): void {
    rows.set(row.id, row)
  }
  function unregisterRow(id: string): void {
    rows.delete(id)
  }
  function registerTask(task: GanttTask, rowId: string): void {
    tasks.set(task.id, { task, rowId })
  }
  function unregisterTask(id: string): void {
    tasks.delete(id)
  }

  // Merge child-registered tasks into the rows they belong to.
  const resolvedRows = computed<GanttRow[]>(() => {
    const byRow = new Map<string, GanttTask[]>()
    for (const { task, rowId } of tasks.values()) {
      const list = byRow.get(rowId)
      if (list) list.push(task)
      else byRow.set(rowId, [task])
    }
    return [...rows.values()].map(row => ({
      ...row,
      tasks: [...(row.tasks ?? []), ...(byRow.get(row.id) ?? [])],
    }))
  })

  const resolvedGroups = computed<GanttGroup[]>(() => [...groups.values()])

  return {
    registerGroup,
    unregisterGroup,
    registerRow,
    unregisterRow,
    registerTask,
    unregisterTask,
    rows: resolvedRows,
    groups: resolvedGroups,
  }
}

/**
 * Consumer-side helper used by `GanttGroup` in declarative mode: keeps the group
 * registered with the parent `GanttRoot` and cleans up on unmount.
 */
export function useRegisteredGroup(getGroup: MaybeRefOrGetter<GanttGroup>): void {
  const ctx = useGanttContext()
  watch(
    () => toValue(getGroup),
    group => ctx.registerGroup(group),
    {
      immediate: true,
      deep: true,
    },
  )
  onUnmounted(() => ctx.unregisterGroup(toValue(getGroup).id))
}

/**
 * Consumer-side helper used by `GanttRow` in declarative mode: keeps the row
 * registered with the parent `GanttRoot` and cleans up on unmount.
 */
export function useRegisteredRow(getRow: MaybeRefOrGetter<GanttRow>): void {
  const ctx = useGanttContext()
  watch(
    () => toValue(getRow),
    row => ctx.registerRow(row),
    { immediate: true, deep: true },
  )
  onUnmounted(() => ctx.unregisterRow(toValue(getRow).id))
}

/**
 * Consumer-side helper used by `GanttTask`/`GanttMilestone` in declarative mode:
 * keeps the task registered against its row and cleans up on unmount.
 */
export function useRegisteredTask(
  getTask: MaybeRefOrGetter<GanttTask>,
  getRowId: MaybeRefOrGetter<string>,
): void {
  const ctx = useGanttContext()
  watch(
    () => [toValue(getTask), toValue(getRowId)] as const,
    ([task, rowId]) => ctx.registerTask(task, rowId),
    { immediate: true, deep: true },
  )
  onUnmounted(() => ctx.unregisterTask(toValue(getTask).id))
}
