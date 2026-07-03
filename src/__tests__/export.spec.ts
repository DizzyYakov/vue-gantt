import { de } from 'date-fns/locale'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { toCSV, downloadCSV, type CSVColumn } from '../export'
import { toCSV as toCSVFromIndex } from '../index'
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
