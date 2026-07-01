import { ref } from 'vue'

/** Focus (and select) the input the moment the inline editor mounts. */
export const vFocus = {
  mounted: (el: HTMLInputElement) => (el.focus(), el.select()),
}

/**
 * Lifecycle for an inline text editor shared by the sidebar row name and the bar
 * label. `start` seeds the draft from `read()` and opens the editor; `save`
 * commits the current draft (when open) and closes; `cancel` closes without
 * committing. Empty/whitespace-only drafts are ignored on save so a name can't be
 * blanked by accident.
 *
 * ```ts
 * const { editing, draft, start, save, cancel } = useInlineEdit(
 *   () => resolved.value.name,
 *   name => ctx.editTask({ id: resolved.value.id, patch: { name }, task: resolved.value }),
 * )
 * ```
 */
export function useInlineEdit(read: () => string, onCommit: (value: string) => void) {
  const editing = ref(false)
  const draft = ref('')

  function start(): void {
    draft.value = read()
    editing.value = true
  }
  /** Commit an explicit value (used by a custom editor slot). */
  function commit(value: string): void {
    if (!editing.value) return
    editing.value = false
    const next = value.trim()
    if (next && next !== read()) onCommit(next)
  }
  /** Commit the current draft (Enter/blur on the built-in input). */
  function save(): void {
    commit(draft.value)
  }
  function cancel(): void {
    editing.value = false
  }

  return { editing, draft, start, save, commit, cancel }
}
