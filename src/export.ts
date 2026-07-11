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
  triggerDownload(toCSV(rows, options), filename, 'text/csv;charset=utf-8')
}

/** Trigger a browser download of `content` under `filename`. Needs a DOM. */
function triggerDownload(content: string, filename: string, mimeType: string): void {
  const blob = new Blob([content], { type: mimeType })
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

/** Cell data type in the SpreadsheetML output (drives Excel's column typing). */
export type ExcelCellType = 'String' | 'Number' | 'DateTime'

/**
 * One Excel column: a header, an optional cell `type` (defaults to `'String'`)
 * and a value derived from each task (and its owning row). Return
 * `null`/`undefined` for an empty cell. A `DateTime` column's value is coerced
 * with `toDate`; a `Number` column's value is emitted verbatim.
 */
export interface ExcelColumn {
  header: string
  type?: ExcelCellType
  value: (task: GanttTask, row: GanttRow) => string | number | Date | null | undefined
}

/** Options for {@link toExcel} / {@link downloadExcel}. */
export interface ExcelOptions {
  /** Override the default column set (mirrors the CSV defaults, but typed). */
  columns?: ExcelColumn[]
  /** Worksheet name. Defaults to `'Tasks'`. */
  sheetName?: string
  /** Emit a header row. Defaults to `true`. */
  header?: boolean
}

/** Escape the five XML entities so a value is safe inside element text. */
function escapeXml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

/** SpreadsheetML DateTime literal (ISO 8601, no timezone) that Excel reads as a date. */
function formatCellDate(value: Date | string | number): string {
  return format(toDate(value), "yyyy-MM-dd'T'HH:mm:ss.SSS")
}

/** The typed columns used when `options.columns` is not supplied: one row per task. */
function defaultExcelColumns(): ExcelColumn[] {
  return [
    { header: 'Row Id', value: (_task, row) => row.id },
    { header: 'Row', value: (_task, row) => row.name ?? row.id },
    { header: 'Task Id', value: (task) => task.id },
    { header: 'Task', value: (task) => task.name ?? task.id },
    { header: 'Type', value: (task) => task.type ?? 'task' },
    { header: 'Start', type: 'DateTime', value: (task) => task.start },
    { header: 'End', type: 'DateTime', value: (task) => task.end ?? task.start },
    { header: 'Progress', type: 'Number', value: (task) => task.progress ?? 0 },
    { header: 'Dependencies', value: (task) => (task.dependencies ?? []).join('; ') },
    { header: 'Deadline', type: 'DateTime', value: (task) => task.deadline },
  ]
}

/** Render one `<Cell>` for a typed column value (empty `<Cell/>` for nullish). */
function excelCell(value: string | number | Date | null | undefined, type: ExcelCellType): string {
  if (value == null) return '<Cell/>'
  if (type === 'Number') return `<Cell><Data ss:Type="Number">${Number(value)}</Data></Cell>`
  if (type === 'DateTime') {
    return `<Cell><Data ss:Type="DateTime">${formatCellDate(value)}</Data></Cell>`
  }
  return `<Cell><Data ss:Type="String">${escapeXml(String(value))}</Data></Cell>`
}

/** Wrap already-rendered `<Cell>` strings into a `<Row>`. */
function excelRow(cells: string[]): string {
  return `<Row>${cells.join('')}</Row>`
}

/**
 * Serialize the tasks of `rows` to a SpreadsheetML 2003 workbook string (the
 * `.xls` XML dialect Excel opens directly). One row per task, with typed cells
 * (dates as real Excel dates, progress as a number). Pure, framework-free and
 * zero-dependency — mirrors {@link toCSV}; customize the layout via
 * `options.columns`.
 */
export function toExcel(rows: GanttRow[], options: ExcelOptions = {}): string {
  const includeHeader = options.header ?? true
  const sheetName = options.sheetName ?? 'Tasks'
  const columns = options.columns ?? defaultExcelColumns()

  const bodyRows: string[] = []
  if (includeHeader) {
    bodyRows.push(excelRow(columns.map((column) => excelCell(column.header, 'String'))))
  }
  for (const row of rows) {
    for (const task of row.tasks ?? []) {
      bodyRows.push(
        excelRow(columns.map((column) => excelCell(column.value(task, row), column.type ?? 'String'))),
      )
    }
  }

  return (
    '<?xml version="1.0"?>' +
    '<?mso-application progid="Excel.Sheet"?>' +
    '<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"' +
    ' xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">' +
    `<Worksheet ss:Name="${escapeXml(sheetName)}">` +
    `<Table>${bodyRows.join('')}</Table>` +
    '</Worksheet>' +
    '</Workbook>'
  )
}

/**
 * Serialize `rows` with {@link toExcel} and trigger a browser download of a
 * `.xls` (SpreadsheetML) file. Needs a DOM (no-op meaning outside the browser).
 */
export function downloadExcel(rows: GanttRow[], filename = 'gantt.xls', options?: ExcelOptions): void {
  triggerDownload(toExcel(rows, options), filename, 'application/vnd.ms-excel')
}
