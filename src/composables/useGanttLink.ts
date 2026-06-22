import { computed, ref, type ComputedRef } from 'vue'
import type {
  GanttBeginLinkArgs,
  GanttEventMap,
  GanttLinkDraft,
  ResolvedTask,
} from '../types'

export interface LinkOptions {
  /** Emit a chart event (the context `dispatch`). */
  dispatch: <K extends keyof GanttEventMap>(name: K, payload: GanttEventMap[K]) => void
  /** Current resolved tasks (for self-link / duplicate guards). */
  tasks: () => ResolvedTask[]
}

export interface GanttLinkApi {
  linkDraft: ComputedRef<GanttLinkDraft | null>
  beginLink: (args: GanttBeginLinkArgs) => void
  endLink: (targetId?: string | null) => void
}

/**
 * Drives the interactive creation / re-routing of finish-to-start dependencies.
 * A connector handle (on a task) or an arrow endpoint starts a drag; the live
 * draft drives a temporary line in `GanttDependencies`; on release the drop
 * target is resolved from the DOM and the matching intent event is emitted
 * (the consumer applies the change to its data — the library stays controlled).
 */
export function useGanttLink(options: LinkOptions): GanttLinkApi {
  const draft = ref<GanttLinkDraft | null>(null)

  function onPointerMove(event: PointerEvent): void {
    if (!draft.value) return
    draft.value = { ...draft.value, pointer: { x: event.clientX, y: event.clientY } }
  }

  function onPointerUp(): void {
    endLink()
  }

  function beginLink(args: GanttBeginLinkArgs): void {
    draft.value = { ...args }
    window.addEventListener('pointermove', onPointerMove)
    window.addEventListener('pointerup', onPointerUp)
  }

  function teardown(): void {
    window.removeEventListener('pointermove', onPointerMove)
    window.removeEventListener('pointerup', onPointerUp)
    draft.value = null
  }

  /** Task id under the current pointer, or `null` over empty space. */
  function resolveTarget(): string | null {
    const d = draft.value
    if (!d) return null
    const el = document.elementFromPoint(d.pointer.x, d.pointer.y)
    const host = (el?.closest('[data-id]') as HTMLElement | null) ?? null
    return host?.dataset.id ?? null
  }

  function hasDependency(toId: string, fromId: string): boolean {
    const to = options.tasks().find((t) => t.id === toId)
    return !!to && to.dependencies.includes(fromId)
  }

  function endLink(explicit?: string | null): void {
    const d = draft.value
    if (!d) return
    const target = explicit !== undefined ? explicit : resolveTarget()
    if (target) emitChange(d, target)
    teardown()
  }

  function emitChange(d: GanttLinkDraft, target: string): void {
    if (d.mode === 'create') {
      // anchor is the predecessor (finish); target is the successor.
      if (target === d.anchorId || hasDependency(target, d.anchorId)) return
      options.dispatch('dependency-create', { from: d.anchorId, to: target })
      return
    }
    if (!d.link) return
    if (d.mode === 'reroute-head') {
      // Move the arrowhead: keep the predecessor, retarget the successor.
      if (target === d.link.to || target === d.link.from) return
      options.dispatch('dependency-update', { from: d.link.from, to: target, previous: d.link })
    } else {
      // reroute-tail: keep the successor, re-source the predecessor.
      if (target === d.link.from || target === d.link.to) return
      options.dispatch('dependency-update', { from: target, to: d.link.to, previous: d.link })
    }
  }

  return { linkDraft: computed(() => draft.value), beginLink, endLink }
}
