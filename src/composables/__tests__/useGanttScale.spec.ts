import { format } from 'date-fns'
import { describe, expect, it } from 'vitest'
import { ref } from 'vue'
import type { GanttLabelFormat } from '../../types'
import { useGanttScale } from '../useGanttScale'

const day = (y: number, m: number, d: number) => new Date(y, m - 1, d)

describe('useGanttScale', () => {
  describe('day unit', () => {
    const scale = useGanttScale({
      unit: ref('day'),
      columnWidth: ref(40),
      start: ref(day(2026, 1, 1)),
      end: ref(day(2026, 1, 10)),
      today: ref(day(2026, 1, 3)),
    })

    it('maps the start date to x=0', () => {
      expect(scale.dateToX(day(2026, 1, 1))).toBe(0)
    })

    it('advances one column width per day', () => {
      expect(scale.dateToX(day(2026, 1, 2))).toBe(40)
      expect(scale.dateToX(day(2026, 1, 6))).toBe(200)
    })

    it('computes width between two dates', () => {
      expect(scale.widthBetween(day(2026, 1, 1), day(2026, 1, 3))).toBe(80)
    })

    it('round-trips through xToDate', () => {
      const back = scale.xToDate(120)
      expect(back.getTime()).toBe(day(2026, 1, 4).getTime())
    })

    it('generates one column per day with the today flag set', () => {
      const cols = scale.columns.value
      expect(cols).toHaveLength(10)
      expect(cols.every(c => c.width === 40)).toBe(true)
      expect(cols.filter(c => c.isToday)).toHaveLength(1)
      expect(cols.find(c => c.isToday)?.date.getTime()).toBe(day(2026, 1, 3).getTime())
    })

    it('reports total content width covering every column', () => {
      expect(scale.contentWidth.value).toBe(400)
    })
  })

  describe('today column precision', () => {
    it('flags the hour column containing the current time (not midnight)', () => {
      const scale = useGanttScale({
        unit: ref('hour'),
        columnWidth: ref(20),
        start: ref(new Date(2026, 0, 1, 0, 0)),
        end: ref(new Date(2026, 0, 1, 6, 0)),
        today: ref(new Date(2026, 0, 1, 3, 30)), // 03:30
      })
      const today = scale.columnsFor('hour').filter(c => c.isToday)
      expect(today).toHaveLength(1)
      expect(today[0]!.date.getHours()).toBe(3) // the 03:00 hour, not 00:00
    })
  })

  describe('week unit', () => {
    it('scales pixels by seven days per column', () => {
      const scale = useGanttScale({
        unit: ref('week'),
        columnWidth: ref(70),
        start: ref(day(2026, 1, 1)),
        end: ref(day(2026, 1, 29)),
      })
      // 70px / 7 days = 10px per day
      expect(scale.dateToX(day(2026, 1, 8))).toBe(70)
      expect(scale.columns.value.length).toBeGreaterThan(0)
    })
  })

  describe('month unit', () => {
    it('renders one column per calendar month', () => {
      const scale = useGanttScale({
        unit: ref('month'),
        columnWidth: ref(120),
        start: ref(day(2026, 1, 1)),
        end: ref(day(2026, 3, 31)),
      })
      expect(scale.columns.value).toHaveLength(3)
      expect(scale.columns.value[0]?.x).toBe(0)
    })
  })

  describe('columnsFor (multi-tier)', () => {
    const scale = useGanttScale({
      unit: ref<'day'>('day'),
      columnWidth: ref(40),
      start: ref(day(2026, 1, 1)),
      end: ref(day(2026, 12, 31)),
    })

    it('builds one cell per quarter and per month over a year', () => {
      expect(scale.columnsFor('quarter')).toHaveLength(4)
      expect(scale.columnsFor('month')).toHaveLength(12)
      expect(scale.columnsFor('year')).toHaveLength(1)
    })

    it('keeps every tier aligned to the same origin', () => {
      expect(scale.columnsFor('quarter')[0]?.x).toBe(0)
      expect(scale.columnsFor('month')[0]?.x).toBe(0)
      // Q2 starts on 1 Apr — 31+28+31 = 90 days in × 40px.
      expect(scale.columnsFor('quarter')[1]?.x).toBe(90 * 40)
    })

    it('caps the full set of an over-fine tier instead of freezing', () => {
      // A full year of minutes (>500k) is bounded by the safety cap.
      const cells = scale.columnsFor('minute')
      expect(cells.length).toBeGreaterThan(0)
      expect(cells.length).toBeLessThanOrEqual(3000)
    })

    it('clamps coarse-tier cells to the content extent (no overflow)', () => {
      // Day base over a single month: week cells naturally spill past month end.
      const monthScale = useGanttScale({
        unit: ref<'day'>('day'),
        columnWidth: ref(32),
        start: ref(day(2026, 6, 1)),
        end: ref(new Date(2026, 5, 30, 23, 59, 59)),
      })
      const max = monthScale.contentWidth.value
      const weeks = monthScale.columnsFor('week')
      expect(weeks.length).toBeGreaterThan(0)
      // Nothing starts before the origin or extends past the content width.
      expect(Math.min(...weeks.map(c => c.x))).toBeGreaterThanOrEqual(0)
      expect(Math.max(...weeks.map(c => c.x + c.width))).toBeLessThanOrEqual(max)
    })

    it('builds sub-day tiers when they fit', () => {
      const hourly = useGanttScale({
        unit: ref<'hour'>('hour'),
        columnWidth: ref(20),
        start: ref(new Date(2026, 0, 1, 0, 0)),
        end: ref(new Date(2026, 0, 1, 6, 0)),
      })
      expect(hourly.columnsFor('hour').length).toBeGreaterThanOrEqual(6)
      expect(hourly.dateToX(new Date(2026, 0, 1, 1, 0))).toBe(20)
    })
  })

  describe('snap', () => {
    const scale = useGanttScale({
      unit: ref<'day'>('day'),
      columnWidth: ref(40),
      start: ref(day(2026, 1, 1)),
      end: ref(day(2026, 1, 10)),
    })

    it('snaps to the nearest base-unit boundary', () => {
      expect(scale.snap(new Date(2026, 0, 3, 5)).getDate()).toBe(3) // 05:00 → day 3
      expect(scale.snap(new Date(2026, 0, 3, 18)).getDate()).toBe(4) // 18:00 → day 4
    })
  })

  describe('labelFormat', () => {
    // A day base over a full year so quarter/month/week/day tiers are all
    // available via columnsFor and there's a non-base tier to assert against.
    // labelFormat is wrapped in a ref to mirror how GanttRoot feeds it
    // (`toRef(props, 'labelFormat')`) — important for the function form, since a
    // bare function would be (correctly) treated as a getter by `toValue`.
    const makeScale = (labelFormat: GanttLabelFormat | undefined) =>
      useGanttScale({
        unit: ref<'day'>('day'),
        columnWidth: ref(40),
        start: ref(day(2026, 1, 1)),
        end: ref(day(2026, 12, 31)),
        labelFormat: ref(labelFormat),
      })

    it('per-tier map: each listed tier uses its format, others fall back to default', () => {
      const scale = makeScale({ month: 'LLLL', day: 'd' })

      const month0 = scale.columnsFor('month')[0]!
      const day0 = scale.columnsFor('day')[0]!
      const week0 = scale.columnsFor('week')[0]!

      // Mapped tiers use the supplied format.
      expect(month0.label).toBe(format(month0.date, 'LLLL'))
      expect(month0.label).toBe('January')
      expect(day0.label).toBe(format(day0.date, 'd'))

      // A tier absent from the map keeps its default ("'W'w" for week).
      expect(week0.label).toBe(format(week0.date, "'W'w"))
    })

    it('function: receives the correct (date, tier) and its result is the label verbatim', () => {
      const scale = makeScale((date, tier) => `${tier}:${date.getDate()}`)

      const month0 = scale.columnsFor('month')[0]!
      const day0 = scale.columnsFor('day')[0]!
      const quarter0 = scale.columnsFor('quarter')[0]!

      // Each label is prefixed with the tier it was generated for.
      expect(month0.label).toBe(`month:${month0.date.getDate()}`)
      expect(day0.label).toBe(`day:${day0.date.getDate()}`)
      expect(quarter0.label).toBe(`quarter:${quarter0.date.getDate()}`)

      // The tier argument matches the requested tier across the whole set.
      expect(scale.columnsFor('month').every((c) => c.label.startsWith('month:'))).toBe(true)
      expect(scale.columnsFor('day').every((c) => c.label.startsWith('day:'))).toBe(true)
    })

    it('string back-compat: applies only to the base unit, non-base tiers stay default', () => {
      const scale = makeScale('yyyy-MM')

      const day0 = scale.columnsFor('day')[0]! // base unit
      const month0 = scale.columnsFor('month')[0]! // non-base tier

      // Base unit (day) picks up the bare string.
      expect(day0.label).toBe(format(day0.date, 'yyyy-MM'))
      // Non-base tier (month) is untouched — default 'MMM'.
      expect(month0.label).toBe(format(month0.date, 'MMM'))
    })

    it('default: omitting labelFormat keeps every tier on its default format', () => {
      const scale = makeScale(undefined)

      const defaults: Record<string, string> = {
        year: 'yyyy',
        quarter: 'QQQ',
        month: 'MMM',
        week: "'W'w",
        day: 'd',
      }
      for (const [tier, fmt] of Object.entries(defaults)) {
        const col = scale.columnsFor(tier as 'day')[0]!
        expect(col.label).toBe(format(col.date, fmt))
      }
    })
  })

  it('reacts to unit changes', () => {
    const unit = ref<'day' | 'week'>('day')
    const scale = useGanttScale({
      unit,
      columnWidth: ref(70),
      start: ref(day(2026, 1, 1)),
      end: ref(day(2026, 1, 8)),
    })
    expect(scale.dateToX(day(2026, 1, 8))).toBe(490)
    unit.value = 'week'
    expect(scale.dateToX(day(2026, 1, 8))).toBe(70)
  })
})
