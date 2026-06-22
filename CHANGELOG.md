# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [Unreleased]

### Added

- **Row grouping** — an optional third level above rows. Rows referencing the
  same `groupId` (with the `groups` prop carrying labels + initial `collapsed`)
  render under a collapsible header band in the sidebar:
  - new `GanttGroup` (declarative wrapper) and `GanttGroupBar` (body rollup bar)
    components, both exported from the package entry;
  - `layoutGroups` layout helper plus `GroupMeta`, `GroupedLayout` and
    `LayoutGroupsOptions` types;
  - `GANTT_GROUP` injection key and `ResolvedGroup` / `GanttGroup` (data) /
    `GanttGroupToggleEvent` types;
  - uncontrolled collapse state on `GanttRoot` with a `group-toggle` event; a
    collapsed group keeps its header, hides its member rows/bars, and still shows
    a rolled-up summary bar;
  - `--gantt-group-*` theme tokens (header band, indent, rollup bar).
- Comprehensive unit-test suite across components and composables (grouping,
  conflicts, dependencies, grid, milestone, task list, timeline, today, view,
  context, drag, item, viewport, registry) and expanded layout/`Gantt` specs.
- Demo playground (`src/dev`) example showcasing grouped rows.
