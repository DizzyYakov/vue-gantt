// Default theme variables + component structural styles, exposed at
// `vue-gantt/styles`. Bundled into a single `dist/gantt.css`.
import './styles/gantt.css'

// Components
export { default as Gantt } from './components/Gantt.vue'
export { default as GanttRoot } from './components/GanttRoot.vue'
export { default as GanttView } from './components/GanttView.vue'
export { default as GanttTimeline } from './components/GanttTimeline.vue'
export { default as GanttTaskList } from './components/GanttTaskList.vue'
export { default as GanttRow } from './components/GanttRow.vue'
export { default as GanttTask } from './components/GanttTask.vue'
export { default as GanttMilestone } from './components/GanttMilestone.vue'
export { default as GanttGrid } from './components/GanttGrid.vue'
export { default as GanttDependencies } from './components/GanttDependencies.vue'
export { default as GanttConflicts } from './components/GanttConflicts.vue'
export { default as GanttToday } from './components/GanttToday.vue'

// Composables
export { useGanttContext } from './composables/useGanttContext'
export { useGanttScale, type ScaleOptions } from './composables/useGanttScale'
export { useGanttItem, type GanttItemProps } from './composables/useGanttItem'
export {
  useGanttRegistry,
  useRegisteredRow,
  useRegisteredTask,
} from './composables/useTaskRegistry'
export { useGanttViewport } from './composables/useGanttViewport'
export { useGanttDrag } from './composables/useGanttDrag'

// Context primitives + layout helpers
export { GANTT_CONTEXT, GANTT_ROW, GANTT_DEFAULTS, normalizeRow, normalizeTask, toDate } from './context'
export { assignLanes, layoutRows, conflictSegments } from './layout'

// Types
export type {
  GanttBand,
  GanttColumn,
  GanttConfig,
  GanttConflict,
  GanttContext,
  GanttItemType,
  GanttMoveEvent,
  GanttOverlapMode,
  GanttRootProps,
  GanttRow as GanttRowData,
  GanttTask as GanttTaskData,
  GanttUnit,
  GanttViewport,
  ResolvedRow,
  ResolvedTask,
} from './types'
