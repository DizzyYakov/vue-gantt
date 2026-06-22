# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [Unreleased]

### Added

- `--gantt-bar-text-shadow` theme token on the task bar label (default `none`),
  so a theme can give the label a contrasting halo when it straddles a dark
  progress fill and a light track. Applied in the shadcn/ui design-system story.

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
