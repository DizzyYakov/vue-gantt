import { de } from 'date-fns/locale'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { toCSV, downloadCSV, type CSVColumn, toExcel, downloadExcel, type ExcelColumn } from '../export'
import { toCSV as toCSVFromIndex, toExcel as toExcelFromIndex } from '../index'
import type { GanttRow } from '../types'

const rows: GanttRow[] = [
  {
    id: 'r1',
    name: 'Backend',
    tasks: [
      {
        id: 'a',
        name: 'Alpha',
        start: '2026-01-01',
        end: '2026-01-05',
        progress: 50,
        deadline: '2026-01-04',
      },
      { id: 'm', name: 'Ship', type: 'milestone', start: '2026-01-10', dependencies: ['a'] },
    ],
  },
]

describe('toCSV', () => {
  it('emits a header plus one line per task in the default column layout', () => {
    const lines = toCSV(rows).split('\r\n')
    expect(lines).toHaveLength(3) // header + 2 tasks
    expect(lines[0]).toBe(
      'Row Id,Row,Task Id,Task,Type,Start,End,Progress,Dependencies,Deadline',
    )
    // Task with an explicit end + deadline.
    expect(lines[1]).toBe('r1,Backend,a,Alpha,task,2026-01-01,2026-01-05,50,,2026-01-04')
    // Milestone: no end → falls back to start; progress defaults to 0; has a dep.
    expect(lines[2]).toBe('r1,Backend,m,Ship,milestone,2026-01-10,2026-01-10,0,a,')
  })

  it('quotes fields containing the delimiter, quotes or newlines (RFC 4180)', () => {
    const tricky: GanttRow[] = [
      { id: 'r', tasks: [{ id: 't', name: 'A, "B"\nC', start: '2026-01-01', end: '2026-01-02' }] },
    ]
    const dataLine = toCSV(tricky, { header: false })
    expect(dataLine).toContain('"A, ""B""\nC"')
  })

  it('honours a custom delimiter', () => {
    const line = toCSV(rows, { header: false, delimiter: ';' }).split('\r\n')[0]
    expect(line).toBe('r1;Backend;a;Alpha;task;2026-01-01;2026-01-05;50;;2026-01-04')
  })

  it('honours a custom dateFormat', () => {
    const line = toCSV(rows, { header: false, dateFormat: 'dd.MM.yyyy' }).split('\r\n')[0]
    expect(line).toContain('01.01.2026')
  })

  it('omits the header when header is false', () => {
    expect(toCSV(rows, { header: false }).split('\r\n')).toHaveLength(2)
  })

  it('supports fully custom columns', () => {
    const columns: CSVColumn[] = [
      { header: 'ID', value: (task) => task.id },
      { header: 'Row', value: (_task, row) => row.name ?? row.id },
    ]
    expect(toCSV(rows, { columns })).toBe('ID,Row\r\na,Backend\r\nm,Backend')
  })

  it('returns only the header for empty rows (empty string when header is off)', () => {
    expect(toCSV([]).split('\r\n')).toHaveLength(1)
    expect(toCSV([], { header: false })).toBe('')
  })

  it('accepts Date objects (passed through toDate)', () => {
    const withDates: GanttRow[] = [
      { id: 'r', tasks: [{ id: 't', start: new Date(2026, 0, 1), end: new Date(2026, 0, 3) }] },
    ]
    expect(toCSV(withDates, { header: false })).toContain('2026-01-01,2026-01-03')
  })

  it('honours a custom locale for the default date columns', () => {
    const line = toCSV(rows, { header: false, dateFormat: 'MMMM', locale: de }).split('\r\n')[0]
    expect(line).toContain('Januar') // de locale, not the default 'January'
  })

  it('honours a custom eol', () => {
    expect(toCSV(rows, { header: false, eol: '\n' })).not.toContain('\r')
    expect(toCSV(rows, { header: false, eol: '\n' }).split('\n')).toHaveLength(2)
  })

  it('skips rows with no tasks (undefined) without erroring', () => {
    const mixed: GanttRow[] = [
      { id: 'empty', name: 'Empty row' },
      { id: 'r', tasks: [{ id: 't', start: '2026-01-01' }] },
    ]
    const lines = toCSV(mixed, { header: false }).split('\r\n')
    expect(lines).toHaveLength(1) // only the row with a task produced a line
    expect(lines[0]).toContain('r,')
  })

  it('is re-exported from the package entry point', () => {
    expect(toCSVFromIndex).toBe(toCSV)
  })
})

describe('downloadCSV', () => {
  afterEach(() => vi.restoreAllMocks())

  it('builds a blob URL and clicks an <a download> with the given filename', () => {
    const createObjectURL = vi.fn<() => string>(() => 'blob:mock')
    const revokeObjectURL = vi.fn<(url: string) => void>()
    vi.stubGlobal('URL', { createObjectURL, revokeObjectURL })
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {})

    downloadCSV(rows, 'tasks.csv')

    expect(createObjectURL).toHaveBeenCalledOnce()
    expect(click).toHaveBeenCalledOnce()
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:mock')
    expect(document.querySelector('a[download]')).toBeNull() // cleaned up
  })
})

describe('toExcel', () => {
  it('emits a SpreadsheetML workbook with one Row per task plus a header', () => {
    const xml = toExcel(rows)
    expect(xml).toContain('<?xml version="1.0"?>')
    expect(xml).toContain('<Workbook')
    expect(xml).toContain('<Worksheet ss:Name="Tasks">')
    expect(xml).toContain('<Table>')
    expect(xml.match(/<Row>/g)).toHaveLength(3) // header + 2 tasks
  })

  it('emits a header row of String cells matching the default columns', () => {
    const xml = toExcel(rows)
    const headerRow = xml.match(/<Row>(.*?)<\/Row>/)?.[1] ?? ''
    expect(headerRow).toBe(
      '<Cell><Data ss:Type="String">Row Id</Data></Cell>' +
        '<Cell><Data ss:Type="String">Row</Data></Cell>' +
        '<Cell><Data ss:Type="String">Task Id</Data></Cell>' +
        '<Cell><Data ss:Type="String">Task</Data></Cell>' +
        '<Cell><Data ss:Type="String">Type</Data></Cell>' +
        '<Cell><Data ss:Type="String">Start</Data></Cell>' +
        '<Cell><Data ss:Type="String">End</Data></Cell>' +
        '<Cell><Data ss:Type="String">Progress</Data></Cell>' +
        '<Cell><Data ss:Type="String">Dependencies</Data></Cell>' +
        '<Cell><Data ss:Type="String">Deadline</Data></Cell>',
    )
  })

  it('omits the header row when header is false', () => {
    const xml = toExcel(rows, { header: false })
    expect(xml.match(/<Row>/g)).toHaveLength(2) // only the 2 tasks
    expect(xml).not.toContain('Row Id')
  })

  it('types Progress as Number and Start/End as DateTime with an ISO literal', () => {
    const xml = toExcel(rows, { header: false })
    expect(xml).toContain('<Cell><Data ss:Type="Number">50</Data></Cell>')
    expect(xml).toContain('<Cell><Data ss:Type="DateTime">2026-01-01T00:00:00.000</Data></Cell>')
    expect(xml).toContain('<Cell><Data ss:Type="DateTime">2026-01-05T00:00:00.000</Data></Cell>')
  })

  it('XML-escapes special characters in string cell values', () => {
    const tricky: GanttRow[] = [
      { id: 'r', tasks: [{ id: 't', name: 'A & B < C > D "E"', start: '2026-01-01' }] },
    ]
    const xml = toExcel(tricky, { header: false })
    expect(xml).toContain('A &amp; B &lt; C &gt; D &quot;E&quot;')
  })

  it('renders an empty <Cell/> for a nullish value (no deadline)', () => {
    const noDeadline: GanttRow[] = [
      { id: 'r', tasks: [{ id: 't', name: 'No deadline', start: '2026-01-01' }] },
    ]
    const xml = toExcel(noDeadline, { header: false })
    expect(xml).toContain('<Cell/>')
  })

  it('supports fully custom columns and a custom sheetName', () => {
    const columns: ExcelColumn[] = [{ header: 'ID', value: (task) => task.id }]
    const xml = toExcel(rows, { columns, sheetName: 'My Sheet' })
    expect(xml).toContain('<Worksheet ss:Name="My Sheet">')
    expect(xml).toContain('<Cell><Data ss:Type="String">ID</Data></Cell>')
    expect(xml).toContain('<Cell><Data ss:Type="String">a</Data></Cell>')
    expect(xml).toContain('<Cell><Data ss:Type="String">m</Data></Cell>')
  })

  it('is re-exported from the package entry point', () => {
    expect(toExcelFromIndex).toBe(toExcel)
  })
})

describe('downloadExcel', () => {
  afterEach(() => vi.restoreAllMocks())

  it('builds a blob URL with the Excel MIME type and clicks an <a download> with the given filename', () => {
    const createObjectURL = vi.fn<(blob: Blob) => string>(() => 'blob:mock')
    const revokeObjectURL = vi.fn<(url: string) => void>()
    vi.stubGlobal('URL', { createObjectURL, revokeObjectURL })
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {})

    downloadExcel(rows, 'tasks.xls')

    expect(createObjectURL).toHaveBeenCalledOnce()
    const blobArg = createObjectURL.mock.calls[0]?.[0]
    expect(blobArg?.type).toBe('application/vnd.ms-excel')
    expect(click).toHaveBeenCalledOnce()
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:mock')
    expect(document.querySelector('a[download]')).toBeNull() // cleaned up
  })
})
