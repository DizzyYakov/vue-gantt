import { computed, ref, type ComputedRef } from 'vue'
import type {
  GanttBeginLinkArgs,
  GanttDependencyType,
  GanttEventMap,
  GanttLinkDraft,
  ResolvedTask,
} from '../types'

/** A resolved drop target: the task id + which half of its bar was hit. */
interface TargetHit {
  id: string
  edge: 'start' | 'finish'
}

/** Compose a link type from the anchor (tail) edge and the drop (head) edge. */
const linkType = (
  anchorEdge: 'finish' | 'start',
  targetEdge: 'start' | 'finish',
): GanttDependencyType =>
  `${anchorEdge === 'finish' ? 'F' : 'S'}${targetEdge === 'start' ? 'S' : 'F'}` as GanttDependencyType

export interface LinkOptions {
  /** Emit a chart event (the context `dispatch`). */
  dispatch: <K extends keyof GanttEventMap>(name: K, payload: GanttEventMap[K]) => void
  /** Current resolved tasks (for self-link / duplicate guards). */
  tasks: () => ResolvedTask[]
  /** Drive viewport edge auto-scroll while linking (pass `null` to stop). */
  autoScroll: (pointer: { x: number; y: number } | null) => void
}

export interface GanttLinkApi {
  linkDraft: ComputedRef<GanttLinkDraft | null>
  beginLink: (args: GanttBeginLinkArgs) => void
  endLink: (targetId?: string | null) => void
  /** Re-resolve the drop target / endpoint from the last pointer (e.g. after the
   *  viewport auto-scrolled under a stationary pointer). No-op when idle. */
  refresh: () => void
}

/**
 * Drives the interactive creation / re-routing of dependency links. A connector
 * handle (on either bar edge) or an arrow endpoint starts a drag; the live
 * draft drives a temporary line in `GanttDependencies`; on release the drop
 * target — and which half of it was hit — is resolved from the DOM, the link
 * type is derived from the two edges (anchor edge → tail letter, drop half →
 * head letter), and the matching intent event is emitted (the consumer applies
 * the change to its data — the library stays controlled).
 */
export function useGanttLink(options: LinkOptions): GanttLinkApi {
  const draft = ref<GanttLinkDraft | null>(null)
  let lastPointer: { x: number; y: number } | null = null

  // Resolve the draft's drop target + endpoint from a client pointer.
  function resolveAt(pointer: { x: number; y: number }): void {
    if (!draft.value) return
    const hit = targetAt(pointer)
    // Highlight the hovered task as a drop target (never the anchor itself).
    const valid = hit && hit.id !== draft.value.anchorId ? hit : null
    // Reassign so `draftPath` recomputes against the live (possibly scrolled) rect.
    draft.value = {
      ...draft.value,
      pointer,
      over: valid?.id ?? null,
      overEdge: valid?.edge ?? null,
    }
  }

  function onPointerMove(event: PointerEvent): void {
    if (!draft.value) return
    lastPointer = { x: event.clientX, y: event.clientY }
    resolveAt(lastPointer)
    options.autoScroll(lastPointer)
  }

  function onPointerUp(): void {
    endLink()
  }

  function beginLink(args: GanttBeginLinkArgs): void {
    draft.value = { ...args }
    // Suppress text selection / show a linking cursor for the whole drag.
    document.body.style.userSelect = 'none'
    document.body.style.cursor = 'crosshair'
    window.addEventListener('pointermove', onPointerMove)
    window.addEventListener('pointerup', onPointerUp)
  }

  function teardown(): void {
    window.removeEventListener('pointermove', onPointerMove)
    window.removeEventListener('pointerup', onPointerUp)
    document.body.style.userSelect = ''
    document.body.style.cursor = ''
    options.autoScroll(null)
    lastPointer = null
    draft.value = null
  }

  // Re-run target resolution from the last pointer (used after an auto-scroll
  // shifts the content under a stationary pointer).
  function refresh(): void {
    if (draft.value && lastPointer) resolveAt(lastPointer)
  }

  /**
   * Task under a client point (or `null` over empty space), plus which half of
   * its bar the pointer is on — the drop half picks the target edge and thereby
   * the second letter of the created link's type (`start` → `*S`, `finish` → `*F`).
   */
  function targetAt(pointer: { x: number; y: number }): TargetHit | null {
    const el = document.elementFromPoint(pointer.x, pointer.y)
    const host = (el?.closest('[data-id]') as HTMLElement | null) ?? null
    const id = host?.dataset.id
    if (!host || !id) return null
    const rect = host.getBoundingClientRect()
    return { id, edge: pointer.x < rect.left + rect.width / 2 ? 'start' : 'finish' }
  }

  function hasDependency(toId: string, fromId: string): boolean {
    const to = options.tasks().find(t => t.id === toId)
    return !!to && to.dependencies.includes(fromId)
  }

  function endLink(explicit?: string | null): void {
    const d = draft.value
    if (!d) return
    // An explicit target id defaults to the start edge (the classic head drop).
    const target =
      explicit !== undefined
        ? explicit != null
          ? { id: explicit, edge: 'start' as const }
          : null
        : targetAt(d.pointer)
    if (target) emitChange(d, target)
    teardown()
  }

  function emitChange(d: GanttLinkDraft, target: TargetHit): void {
    if (d.mode === 'create') {
      // The anchor is the predecessor; its edge + the drop edge pick the type.
      if (target.id === d.anchorId || hasDependency(target.id, d.anchorId)) return
      options.dispatch('dependency-create', {
        from: d.anchorId,
        to: target.id,
        type: linkType(d.anchorEdge, target.edge),
      })
      return
    }
    if (!d.link) return
    const prevType = d.link.type ?? 'FS'
    if (d.mode === 'reroute-head') {
      // Move the arrowhead: keep the predecessor (and the tail letter), retarget
      // the successor — the drop half picks the new head letter.
      if (target.id === d.link.to || target.id === d.link.from) return
      options.dispatch('dependency-update', {
        from: d.link.from,
        to: target.id,
        type: `${prevType[0]}${target.edge === 'start' ? 'S' : 'F'}` as GanttDependencyType,
        lag: d.link.lag,
        previous: d.link,
      })
    } else {
      // reroute-tail: keep the successor (and the head letter), re-source the
      // predecessor — the drop half picks the new tail letter.
      if (target.id === d.link.from || target.id === d.link.to) return
      options.dispatch('dependency-update', {
        from: target.id,
        to: d.link.to,
        type: `${target.edge === 'start' ? 'S' : 'F'}${prevType[1]}` as GanttDependencyType,
        lag: d.link.lag,
        previous: d.link,
      })
    }
  }

  return { linkDraft: computed(() => draft.value), beginLink, endLink, refresh }
}
