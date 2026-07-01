// Default theme variables + component structural styles, exposed at
// `vue-gantt/styles`. Bundled into a single `dist/gantt.css`.
import './styles/gantt.css'

// Components
export { default as Gantt } from './components/Gantt.vue'
export { default as GanttRoot } from './components/GanttRoot.vue'
export { default as GanttView } from './components/GanttView.vue'
export { default as GanttTimeline } from './components/GanttTimeline.vue'
export { default as GanttTaskList } from './components/GanttTaskList.vue'
export { default as GanttGroup } from './components/GanttGroup.vue'
export { default as GanttGroupBar } from './components/GanttGroupBar.vue'
export { default as GanttRow } from './components/GanttRow.vue'
export { default as GanttTask } from './components/GanttTask.vue'
export { default as GanttMilestone } from './components/GanttMilestone.vue'
export { default as GanttGrid } from './components/GanttGrid.vue'
export { default as GanttDependencies } from './components/GanttDependencies.vue'
export { default as GanttConflicts } from './components/GanttConflicts.vue'
export { default as GanttSlack } from './components/GanttSlack.vue'
export { default as GanttDeadlines } from './components/GanttDeadlines.vue'
export { default as GanttToday } from './components/GanttToday.vue'
export { default as GanttZoom } from './components/GanttZoom.vue'

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
export {
  GANTT_CONTEXT,
  GANTT_ROW,
  GANTT_GROUP,
  GANTT_DEFAULTS,
  normalizeRow,
  normalizeTask,
  toDate,
} from './context'
export { assignLanes, layoutRows, layoutGroups, conflictSegments } from './layout'
export type { GroupMeta, GroupedLayout, LayoutGroupsOptions } from './layout'

// Zoom / view-mode presets — pass your own to the `zoomLevels` prop
export { DEFAULT_ZOOM_LEVELS } from './zoom'

// Dependency connector path builders — pass one (or your own) to `dependencyShape`
export { elbowPath, straightPath, bezierPath, STUB } from './dependencyPaths'
export type { DependencyPoint, DependencyPathBuilder } from './dependencyPaths'

// Dependency arrowhead builders — pass one (or your own) to `arrowHead`
export { triangleArrow, openArrow, noArrow } from './arrowHeads'
export type { ArrowHeadShape, ArrowHeadBuilder } from './arrowHeads'

// Data utilities (pure helpers over `rows`/`tasks`)
export {
  flattenTasks,
  findTask,
  findRow,
  sortRows,
  filterRows,
  applyMove,
  updateTask,
  addTask,
  removeTask,
  tasksExtent,
  rollupProgress,
  getDependents,
  addDependency,
  removeDependency,
  detectCycles,
  topologicalOrder,
  criticalPath,
  slack,
  autoSchedule,
  isOverdue,
  violatesConstraint,
  validateRows,
} from './utils'

// Types
export type {
  GanttBand,
  GanttCellEvent,
  GanttColumn,
  GanttColumnEvent,
  GanttConfig,
  GanttConflict,
  GanttConstraint,
  GanttConstraintType,
  GanttContext,
  GanttDependencyChange,
  GanttDependencyEvent,
  GanttDependencyUpdate,
  GanttDragLabelInfo,
  GanttEventMap,
  GanttBeginLinkArgs,
  GanttGroup as GanttGroupData,
  GanttGroupToggleEvent,
  GanttIssue,
  GanttIssueType,
  GanttLabelFormat,
  GanttItemType,
  GanttLinkDraft,
  GanttLinkMode,
  GanttMoveEvent,
  GanttOverlapMode,
  GanttProgressEvent,
  GanttResizeEvent,
  GanttRootProps,
  GanttRow as GanttRowData,
  GanttRowEvent,
  GanttScrollOptions,
  GanttTask as GanttTaskData,
  GanttTaskEvent,
  GanttUnit,
  GanttViewport,
  GanttZoomEvent,
  GanttZoomLevel,
  ResolvedGroup,
  ResolvedRow,
  ResolvedTask,
} from './types'
