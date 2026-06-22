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
- `--gantt-bar-text-shadow` theme token on the task bar label (default `none`),
  so a theme can give the label a contrasting halo when it straddles a dark
  progress fill and a light track. Applied in the shadcn/ui design-system story.
- Comprehensive unit-test suite across components and composables (grouping,
  conflicts, dependencies, grid, milestone, task list, timeline, today, view,
  context, drag, item, viewport, registry) and expanded layout/`Gantt` specs.
- Demo playground (`src/dev`) example showcasing grouped rows.

### Fixed

- Storybook `Components/Gantt → Multiple Tiers` story no longer opens visually
  empty: the quarter tier snaps the range to the whole quarter, so the sample
  data now spans Apr–Jun and bars are visible from the start.
- Storybook `Components/GanttMilestone` story now showcases milestones inside the
  default viewport (a release plan with GA/Beta/RC markers) instead of reusing
  the shared chart whose only milestone sat off-screen.
- Storybook per-component canvas: removed a 1px sidebar/body misalignment by
  giving `.sb-chart__corner` `box-sizing: border-box` so its `border-bottom` is
  included in the header height.
- shadcn/ui design-system story: task labels were invisible over the near-black
  progress fill; they now use a white halo and stay legible over both the filled
  and empty parts of a bar.
