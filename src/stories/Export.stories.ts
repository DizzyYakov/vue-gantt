import type { Meta, StoryObj } from '@storybook/vue3-vite'
import Gantt from '../components/Gantt.vue'
import { downloadCSV, downloadExcel } from '../export'
import { sampleRows } from './_shared'

/**
 * # Data export
 *
 * Zero-dependency serializers turn your `rows` into a downloadable file — one line
 * per task, with its row's id/name as leading columns:
 *
 * - `downloadCSV(rows, filename?)` / `toCSV(rows, options?)` — RFC-4180 CSV.
 *   `toCSV` returns the string for custom handling; override `columns`,
 *   `delimiter`, `dateFormat`, etc.
 * - `downloadExcel(rows, filename?)` / `toExcel(rows, options?)` — SpreadsheetML
 *   2003 (`.xls`) workbook with typed cells (real Excel dates, numeric progress).
 *   `toExcel` returns the string; override `columns` (with a per-column `type`) or
 *   `sheetName`.
 *
 * These are pure functions over the data model — independent of the rendered
 * chart, so you can call them from a toolbar button as shown below.
 */
const meta: Meta<typeof Gantt> = {
  title: 'Guides/Data export',
  component: Gantt,
  tags: ['autodocs'],
  args: {
    rows: sampleRows,
    tiers: ['month', 'week', 'day'],
    columnWidth: 40,
    height: 260,
  },
}
export default meta

type Story = StoryObj<typeof Gantt>

/**
 * `downloadCSV(rows)` serializes the tasks to an RFC-4180 CSV file and triggers a
 * browser download. `toCSV(rows, options)` returns the string for custom handling.
 */
export const ExportCsv: Story = {
  render: args => ({
    components: { Gantt },
    setup: () => ({ args, exportCsv: () => downloadCSV(args.rows ?? [], 'gantt.csv') }),
    template: `
      <div>
        <button type="button" style="margin-bottom:8px" @click="exportCsv">Export CSV</button>
        <Gantt v-bind="args" />
      </div>`,
  }),
}

/**
 * `downloadExcel(rows)` serializes the tasks to a SpreadsheetML 2003 (`.xls`)
 * workbook — zero-dependency, with typed cells. `toExcel(rows, options)` returns
 * the string for custom handling.
 */
export const ExportExcel: Story = {
  render: args => ({
    components: { Gantt },
    setup: () => ({ args, exportExcel: () => downloadExcel(args.rows ?? [], 'gantt.xls') }),
    template: `
      <div>
        <button type="button" style="margin-bottom:8px" @click="exportExcel">Export to Excel</button>
        <Gantt v-bind="args" />
      </div>`,
  }),
}
