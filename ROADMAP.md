# Roadmap

vue-gantt's direction is **feedback-driven**. The most useful thing you can do is tell
us what you're building:

- 💡 [Open a feature request](https://github.com/DizzyYakov/vue-gantt/issues/new?template=feature_request.yml)
  (describe the **use case** — that's what we prioritise).
- 🐛 [File a bug](https://github.com/DizzyYakov/vue-gantt/issues/new?template=bug_report.yml).
- 💬 [Start a discussion](https://github.com/DizzyYakov/vue-gantt/discussions) — questions, ideas, "what would you use this for?".
- 👍 React to existing issues instead of opening duplicates — that's how we rank demand.

## Shipped

Two-level data model (rows contain tasks), multi-tier time axis, virtualization, and a
fully headless / CSS-variable-themed design. Feature highlights:

- Dependencies (finish-to-start) with critical path & free-float slack
- Row grouping, WBS tree (roll-ups), baselines (plan vs actual)
- Resources + workload histogram, non-working calendars, timeline periods/sprints
- Interactions: drag-move, edge resize, progress drag, drag-to-create, dependency linking,
  `v-model:rows`, undo/redo, auto-scheduling
- Keyboard & screen-reader accessibility (opt-in)
- Localization (date-fns), CSV / Excel export
- Overlap modes (lanes / blend / cascade / conflict), deadlines & constraints

## Under consideration

We intentionally keep this short and let demand shape it. Have a need here — or something
not listed? Open an issue or discussion and we'll fold it in.

- More **end-to-end examples / recipes** (real-world dashboards, not just per-feature demos)
- Whatever you vote for 👆

_This file is a living summary, not a commitment or a schedule._
