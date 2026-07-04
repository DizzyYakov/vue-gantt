import { computed, reactive, type ComputedRef } from 'vue'
import type { GroupMeta } from '../layout'
import type { GanttGroup, GanttGroupToggleEvent } from '../types'

export interface GroupsOptions {
  /** Source groups (the `groups` prop or declarative registration). */
  sourceGroups: () => GanttGroup[]
  /** `group-toggle` event — a group's collapsed state flipped. */
  onToggle: (event: GanttGroupToggleEvent) => void
}

export interface GanttGroupsApi {
  /** Per-group rollup metadata (name + collapsed + meta) keyed by id. */
  groupMeta: ComputedRef<Map<string, GroupMeta>>
  toggleGroup: (id: string) => void
}

/**
 * Group collapse state. Uncontrolled: a user toggle is recorded as an explicit
 * override that wins over the group's `collapsed` default; without an override
 * the default applies. This is fully derived (no async seeding), so the default
 * takes effect synchronously in both prop-driven and declarative (post-mount
 * registration) modes, and re-renders / dynamic groups never clobber a user
 * toggle. `toggleGroup` flips the override and re-emits as the `group-toggle` event.
 */
export function useGanttGroups(options: GroupsOptions): GanttGroupsApi {
  const collapseOverrides = reactive(new Map<string, boolean>())

  function isCollapsed(group: GanttGroup): boolean {
    return collapseOverrides.get(group.id) ?? group.collapsed ?? false
  }

  const groupMeta = computed<Map<string, GroupMeta>>(
    () =>
      new Map(
        options.sourceGroups().map(group => [
          group.id,
          {
            name: group.name ?? group.id,
            collapsed: isCollapsed(group),
            meta: group.meta ?? {},
          },
        ]),
      ),
  )

  function toggleGroup(id: string): void {
    const group = options.sourceGroups().find(g => g.id === id)
    const current = group ? isCollapsed(group) : (collapseOverrides.get(id) ?? false)
    collapseOverrides.set(id, !current)
    options.onToggle({ id, collapsed: !current })
  }

  return { groupMeta, toggleGroup }
}
