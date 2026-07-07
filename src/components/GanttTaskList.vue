<script setup lang="ts">
import { computed, ref } from 'vue'
import { useGanttContext } from '../composables/useGanttContext'
import { useInlineEdit, vFocus } from '../composables/useInlineEdit'
import { useLongPress } from '../composables/useLongPress'
import type { GanttRowEvent, ResolvedRow } from '../types'

const { visibleRows, visibleGroups, toggleGroup, toggleRow, dispatch, config, editRow } =
  useGanttContext()

// Tree rows indent by depth; a plain (group/flat) row keeps depth 0 (no inline
// pad, so the `[data-group]` indent still applies).
function rowIndent(row: ResolvedRow): string | undefined {
  if (row.depth <= 0) return undefined
  return `calc(var(--gantt-row-indent, 16px) * ${row.depth})`
}

const emit = defineEmits<{
  'row-click': [event: GanttRowEvent]
  'row-dblclick': [event: GanttRowEvent]
  'row-contextmenu': [event: GanttRowEvent]
}>()

const editable = computed(() => config.value.editable)

// Inline rename of a row name (opt-in via `editable`, on double-click). Only one
// row edits at a time; `editingRow` tracks which.
const editingRow = ref<ResolvedRow | null>(null)
const {
  editing: editingName,
  draft: nameDraft,
  start,
  save,
  commit,
  cancel,
} = useInlineEdit(
  () => editingRow.value?.name ?? '',
  name => {
    const row = editingRow.value
    if (row) editRow({ id: row.id, patch: { name }, row })
  },
)
function startRowEdit(row: ResolvedRow): void {
  editingRow.value = row
  start()
}

// Touch has no `dblclick`; a long-press on a row opens the same name editor. One
// shared timer edits whichever row armed it (`pressedRow`).
let pressedRow: ResolvedRow | null = null
const longPress = useLongPress(() => {
  if (editable.value && pressedRow) startRowEdit(pressedRow)
})
function onRowDown(row: ResolvedRow, event: PointerEvent): void {
  pressedRow = row
  longPress.onPointerdown(event)
}

function onRowClick(row: ResolvedRow, event: MouseEvent): void {
  emit('row-click', { row, event })
  dispatch('row-click', { row, event })
}
function onRowDblclick(row: ResolvedRow, event: MouseEvent): void {
  emit('row-dblclick', { row, event })
  dispatch('row-dblclick', { row, event })
  if (editable.value) startRowEdit(row)
}
function onRowContextmenu(row: ResolvedRow, event: MouseEvent): void {
  emit('row-contextmenu', { row, event })
  dispatch('row-contextmenu', { row, event })
}
</script>

<template>
  <div class="gantt-task-list" :style="{ height: 'var(--gantt-content-height)' }">
    <!-- Collapsible group headers (a band above their member rows). -->
    <div
      v-for="group in visibleGroups"
      :key="`g-${group.id}`"
      class="gantt-task-list__group"
      :data-id="group.id"
      :data-collapsed="group.collapsed || undefined"
      :style="{ top: `${group.top}px`, height: `${group.height}px` }"
    >
      <slot
        name="group"
        :group="group"
        :collapsed="group.collapsed"
        :toggle="() => toggleGroup(group.id)"
      >
        <button
          type="button"
          class="gantt-task-list__group-toggle"
          :aria-expanded="!group.collapsed"
          @click="toggleGroup(group.id)"
        >
          <span class="gantt-task-list__chevron" aria-hidden="true" />
          <span class="gantt-task-list__group-name">{{ group.name }}</span>
        </button>
      </slot>
    </div>

    <div
      v-for="row in visibleRows"
      :key="row.id"
      class="gantt-task-list__row"
      :data-id="row.id"
      :data-group="row.groupId || undefined"
      :data-depth="row.depth || undefined"
      :data-has-children="row.hasChildren || undefined"
      :data-collapsed="(row.hasChildren && row.collapsed) || undefined"
      :style="{ top: `${row.top}px`, height: `${row.height}px`, paddingLeft: rowIndent(row) }"
      @pointerdown="onRowDown(row, $event)"
      @pointermove="longPress.onPointermove"
      @pointerup="longPress.onPointerup"
      @pointercancel="longPress.onPointercancel"
      @click="onRowClick(row, $event)"
      @dblclick="onRowDblclick(row, $event)"
      @contextmenu="onRowContextmenu(row, $event)"
    >
      <slot
        name="row"
        :row="row"
        :index="row.order"
        :depth="row.depth"
        :collapsed="row.collapsed"
        :has-children="row.hasChildren"
        :toggle="() => toggleRow(row.id)"
      >
        <button
          v-if="row.hasChildren"
          type="button"
          class="gantt-task-list__row-toggle"
          :aria-expanded="!row.collapsed"
          @click.stop="toggleRow(row.id)"
          @dblclick.stop
        >
          <span class="gantt-task-list__chevron" aria-hidden="true" />
        </button>
        <slot
          v-if="editable && editingName && editingRow?.id === row.id"
          name="rowEditor"
          :row="row"
          :value="nameDraft"
          :commit="commit"
          :cancel="cancel"
        >
          <input
            v-model="nameDraft"
            v-focus
            class="gantt-edit-input gantt-task-list__name"
            @keydown.enter="save"
            @keydown.esc="cancel"
            @blur="save"
            @click.stop
            @dblclick.stop
          />
        </slot>
        <span v-else class="gantt-task-list__name">{{ row.name }}</span>
      </slot>
    </div>
  </div>
</template>

<style scoped>
.gantt-task-list {
  position: relative;
}

.gantt-task-list__row {
  position: absolute;
  left: 0;
  right: 0;
  box-sizing: border-box;
  display: flex;
  align-items: center;
  overflow: hidden;
  border-bottom: var(--gantt-grid-border, 1px solid var(--gantt-grid-color, #e5e7eb));
}

/* Member rows are indented under their group header. */
.gantt-task-list__row[data-group] {
  padding-left: var(--gantt-group-indent, 16px);
}

/* Tree row collapse toggle: a compact button wrapping the chevron. */
.gantt-task-list__row-toggle {
  display: flex;
  align-items: center;
  justify-content: center;
  flex: none;
  width: 18px;
  height: 100%;
  padding: 0;
  border: 0;
  background: none;
  color: inherit;
  cursor: pointer;
}

.gantt-task-list__row[data-collapsed] .gantt-task-list__chevron {
  transform: rotate(0deg);
}

.gantt-task-list__name {
  padding: 0 12px;
  white-space: nowrap;
  text-overflow: ellipsis;
  overflow: hidden;
}

/* Inline editor: an input styled to sit in the same cell as the name. */
.gantt-edit-input {
  flex: 1;
  min-width: 0;
  box-sizing: border-box;
  font: inherit;
  color: var(--gantt-edit-color, inherit);
  background: var(--gantt-edit-bg, var(--gantt-surface, #fff));
  border: var(--gantt-edit-border, 1px solid var(--gantt-progress-bg, #6366f1));
  border-radius: var(--gantt-edit-radius, 3px);
}

.gantt-task-list__group {
  position: absolute;
  left: 0;
  right: 0;
  box-sizing: border-box;
  display: flex;
  align-items: center;
  overflow: hidden;
  background: var(--gantt-group-header-bg, #f8fafc);
  color: var(--gantt-group-header-color, inherit);
  font-weight: var(--gantt-group-header-font-weight, 600);
  border-bottom: var(--gantt-grid-border, 1px solid var(--gantt-grid-color, #e5e7eb));
}

.gantt-task-list__group-toggle {
  display: flex;
  align-items: center;
  gap: 6px;
  width: 100%;
  height: 100%;
  padding: 0 10px;
  border: 0;
  background: none;
  font: inherit;
  color: inherit;
  text-align: left;
  cursor: pointer;
}

.gantt-task-list__chevron {
  width: 0;
  height: 0;
  flex: none;
  border-top: 4px solid transparent;
  border-bottom: 4px solid transparent;
  border-left: 6px solid currentcolor;
  /* Points down when expanded; rotates to point right when collapsed. */
  transform: rotate(90deg);
  transition: transform 0.15s ease;
}

.gantt-task-list__group[data-collapsed] .gantt-task-list__chevron {
  transform: rotate(0deg);
}

.gantt-task-list__group-name {
  white-space: nowrap;
  text-overflow: ellipsis;
  overflow: hidden;
}
</style>
