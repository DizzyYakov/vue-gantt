import { format } from 'date-fns'
import type { Locale } from 'date-fns'
import { toDate } from './context'
import type { GanttRow, GanttTask } from './types'

/**
 * One CSV column: a header and a value derived from each task (and its owning
 * row). Return `null`/`undefined` for an empty cell; anything else is coerced to
 * a string and escaped.
 */
export interface CSVColumn {
  header: string
  value: (task: GanttTask, row: GanttRow) => string | number | null | undefined
}

/** Options for {@link toCSV} / {@link downloadCSV}. */
export interface CSVOptions {
  /** Override the default column set (below). */
  columns?: CSVColumn[]
  /** Field separator. Defaults to `','`. */
  delimiter?: string
  /** date-fns format for the default date columns. Defaults to `'yyyy-MM-dd'`. */
  dateFormat?: string
  /** date-fns locale for the date columns. */
  locale?: Locale
  /** Emit a header row. Defaults to `true`. */
  header?: boolean
  /** Line ending. Defaults to `'\r\n'` (RFC 4180). */
  eol?: string
}

/** Quote a field per RFC 4180 when it holds the delimiter, a quote or a newline. */
function escapeField(field: string, delimiter: string): string {
  if (
    field.includes(delimiter) ||
    field.includes('"') ||
    field.includes('\n') ||
    field.includes('\r')
  ) {
    return `"${field.replace(/"/g, '""')}"`
  }
  return field
}

/** Coerce a column value to a string (empty for `null`/`undefined`). */
function stringify(value: string | number | null | undefined): string {
  if (value == null) return ''
  return String(value)
}

/** The columns used when `options.columns` is not supplied: one row per task. */
function defaultColumns(formatDate: (value?: Date | string | number) => string): CSVColumn[] {
  return [
    { header: 'Row Id', value: (_task, row) => row.id },
    { header: 'Row', value: (_task, row) => row.name ?? row.id },
    { header: 'Task Id', value: (task) => task.id },
    { header: 'Task', value: (task) => task.name ?? task.id },
    { header: 'Type', value: (task) => task.type ?? 'task' },
    { header: 'Start', value: (task) => formatDate(task.start) },
    { header: 'End', value: (task) => formatDate(task.end ?? task.start) },
    { header: 'Progress', value: (task) => task.progress ?? 0 },
    { header: 'Dependencies', value: (task) => (task.dependencies ?? []).join('; ') },
    { header: 'Deadline', value: (task) => formatDate(task.deadline) },
  ]
}

/**
 * Serialize the tasks of `rows` to a CSV string (RFC 4180). One line per task,
 * with its owning row's id/name as leading columns. Pure and framework-free —
 * accepts either raw `GanttRow[]` or the resolved rows from the context (dates
 * are coerced with `toDate`, so `Date`s pass through untouched). Customize the
 * layout via `options.columns`.
 */
export function toCSV(rows: GanttRow[], options: CSVOptions = {}): string {
  const delimiter = options.delimiter ?? ','
  const dateFormat = options.dateFormat ?? 'yyyy-MM-dd'
  const includeHeader = options.header ?? true
  const eol = options.eol ?? '\r\n'

  const formatDate = (value?: Date | string | number): string => {
    if (value == null) return ''
    return format(toDate(value), dateFormat, { locale: options.locale })
  }

  const columns = options.columns ?? defaultColumns(formatDate)
  const toLine = (cells: string[]): string =>
    cells.map((cell) => escapeField(cell, delimiter)).join(delimiter)

  const lines: string[] = []
  if (includeHeader) lines.push(toLine(columns.map((column) => column.header)))
  for (const row of rows) {
    for (const task of row.tasks ?? []) {
      lines.push(toLine(columns.map((column) => stringify(column.value(task, row)))))
    }
  }
  return lines.join(eol)
}

/**
 * Serialize `rows` with {@link toCSV} and trigger a browser download. Thin
 * convenience over `toCSV` — needs a DOM (no-op meaning outside the browser).
 */
export function downloadCSV(rows: GanttRow[], filename = 'gantt.csv', options?: CSVOptions): void {
  const blob = new Blob([toCSV(rows, options)], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  anchor.style.display = 'none'
  document.body.appendChild(anchor)
  anchor.click()
  document.body.removeChild(anchor)
  URL.revokeObjectURL(url)
}
