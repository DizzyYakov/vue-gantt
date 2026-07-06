import {
  addDays,
  addHours,
  addMinutes,
  addMonths,
  addQuarters,
  addWeeks,
  addYears,
  format,
  startOfDay,
  startOfHour,
  startOfMinute,
  startOfMonth,
  startOfQuarter,
  startOfWeek,
  startOfYear,
} from 'date-fns'
import type { Day, Locale } from 'date-fns'
import { computed, toValue, type MaybeRefOrGetter } from 'vue'
import { toDate } from '../context'
import type { WeekBoundaryOptions } from '../dateUnits'
import type { GanttColumn, GanttLabelFormat, GanttUnit } from '../types'

const MS_PER_DAY = 86_400_000

/** Approximate days a single cell of each tier spans (drives `pxPerDay`). */
const TIER_DAYS: Record<GanttUnit, number> = {
  year: 365.25,
  quarter: 91.3125,
  month: 30.436_875,
  week: 7,
  day: 1,
  hour: 1 / 24,
  minute: 1 / 1440,
}

const DEFAULT_LABEL_FORMAT: Record<GanttUnit, string> = {
  year: 'yyyy',
  quarter: 'QQQ',
  month: 'MMM',
  week: "'W'w",
  day: 'd',
  hour: 'HH',
  minute: 'mm',
}

/**
 * Localized prefix for the default week label (date-fns has no localized "week"
 * word token like `MMM` gives for months). Keyed by the locale's primary
 * language subtag; anything unmapped falls back to `'W'`. Override the whole
 * week label via `labelFormat` if a different form is needed.
 */
const WEEK_PREFIX: Record<string, string> = {
  en: 'W',
  ru: 'Н',
  de: 'KW',
  fr: 'S',
}

function weekPrefix(locale: Locale | undefined): string {
  const language = locale?.code?.split('-')[0]
  if (language && WEEK_PREFIX[language]) return WEEK_PREFIX[language]
  return 'W'
}

/** The tier's default format, with the week prefix localized per `locale`. */
function defaultFormatFor(tier: GanttUnit, locale: Locale | undefined): string {
  // Wrap the prefix in single quotes so its letters (e.g. `K`/`W` in `KW`) are
  // treated as literals, not date-fns format tokens.
  if (tier === 'week') return `'${weekPrefix(locale)}'w`
  return DEFAULT_LABEL_FORMAT[tier]
}

/** Floor a date to the start of its tier cell. */
const FLOOR: Record<GanttUnit, (date: Date) => Date> = {
  year: startOfYear,
  quarter: startOfQuarter,
  month: startOfMonth,
  week: startOfWeek,
  day: startOfDay,
  hour: startOfHour,
  minute: startOfMinute,
}

/** Advance one cell to find a tier's exact (variable-length) cell width. */
const NEXT_BOUNDARY: Record<GanttUnit, (date: Date, amount: number) => Date> = {
  year: addYears,
  quarter: addQuarters,
  month: addMonths,
  week: addWeeks,
  day: addDays,
  hour: addHours,
  minute: addMinutes,
}

/** Safety cap so an over-fine tier over a long range can't freeze the page. */
const MAX_CELLS = 3000

/** Fractional day distance from `a` to `b` (negative when `b` precedes `a`). */
function daysBetween(a: Date, b: Date): number {
  return (b.getTime() - a.getTime()) / MS_PER_DAY
}

export interface ScaleOptions {
  /** Base (finest) granularity that drives pixel density. */
  unit: MaybeRefOrGetter<GanttUnit>
  columnWidth: MaybeRefOrGetter<number>
  start: MaybeRefOrGetter<Date>
  end: MaybeRefOrGetter<Date>
  today?: MaybeRefOrGetter<Date>
  /**
   * Override column label formatting (string = base unit, per-tier map, or
   * `(date, tier) => string`). NOTE: when the value is the function form, pass it
   * wrapped in a ref/getter (e.g. `toRef(props, 'labelFormat')`) — a bare function
   * is treated by `toValue` as a getter and called with no arguments.
   */
  labelFormat?: MaybeRefOrGetter<GanttLabelFormat | undefined>
  /** date-fns `Locale` for the (non-function) label formats. */
  locale?: MaybeRefOrGetter<Locale | undefined>
  /**
   * First day of the week (0 = Sunday … 6 = Saturday) for week-tier cell
   * boundaries and the `w` number token. Overrides the `locale`'s own
   * `weekStartsOn`; when unset it falls back to the locale, then Sunday.
   */
  weekStartsOn?: MaybeRefOrGetter<Day | undefined>
}

/**
 * Pure positioning logic shared by every visual component: maps dates to pixel
 * offsets and generates time-axis columns for any tier. Everything is derived
 * from `pxPerDay` so bars and all header rows stay aligned.
 */
export function useGanttScale(options: ScaleOptions) {
  const pxPerDay = computed(() => {
    const unit = toValue(options.unit)
    return toValue(options.columnWidth) / TIER_DAYS[unit]
  })

  /** Week-boundary options: an explicit `weekStartsOn` wins over the locale. */
  function weekOptions(): WeekBoundaryOptions {
    return { weekStartsOn: toValue(options.weekStartsOn), locale: toValue(options.locale) }
  }

  /** Floor to the tier's cell start; the week floor honors the locale/`weekStartsOn`. */
  function floorTo(tier: GanttUnit, date: Date): Date {
    if (tier === 'week') return startOfWeek(date, weekOptions())
    return FLOOR[tier](date)
  }

  function dateToX(date: Date | string | number): number {
    return daysBetween(toValue(options.start), toDate(date)) * pxPerDay.value
  }

  function widthBetween(start: Date | string | number, end: Date | string | number): number {
    return daysBetween(toDate(start), toDate(end)) * pxPerDay.value
  }

  function xToDate(x: number): Date {
    const ms = toValue(options.start).getTime() + (x / pxPerDay.value) * MS_PER_DAY
    return new Date(ms)
  }

  /** Snap a date to the nearest base-unit boundary (for drag & drop). */
  function snap(date: Date): Date {
    const base = toValue(options.unit)
    const floor = floorTo(base, date)
    const next = NEXT_BOUNDARY[base](floor, 1)
    return date.getTime() - floor.getTime() <= next.getTime() - date.getTime() ? floor : next
  }

  // Content extent, derived analytically (no full scan) from the base unit's
  // last cell — so even a minute base over a long range is O(1).
  const contentWidth = computed(() => {
    const start = toValue(options.start)
    const end = toValue(options.end)
    if (end <= start) return 0
    const base = toValue(options.unit)
    const lastCellEnd = NEXT_BOUNDARY[base](floorTo(base, end), 1)
    return Math.max(0, dateToX(lastCellEnd))
  })

  /**
   * Build a tier's columns intersecting the pixel window `[xMin, xMax]`, clamped
   * to `[0, contentWidth]`. Only the requested window is generated, so a fine
   * tier (hour/minute) over a long range stays cheap when virtualized. Coarse
   * tiers (week/month) have cells whose natural boundaries fall outside the
   * range; clamping prevents them from adding empty scroll space at the edges.
   */
  function columnsBetween(tier: GanttUnit, xMin: number, xMax: number): GanttColumn[] {
    const start = toValue(options.start)
    const end = toValue(options.end)
    if (end <= start) return []

    const max = contentWidth.value
    const lo = Math.max(0, xMin)
    const hi = Math.min(max, xMax)
    if (hi <= lo) return []

    const today = options.today ? toValue(options.today) : undefined

    // Resolve the label strategy once per call (not per cell): a function gets
    // full control; a per-tier map overrides specific tiers; a bare string
    // overrides the base unit only (back-compat); anything unset falls back to
    // the tier's default format.
    const lf = toValue(options.labelFormat)
    const loc = toValue(options.locale)
    let labelFor: (date: Date) => string
    if (typeof lf === 'function') {
      labelFor = (date) => lf(date, tier)
    } else {
      let fmt: string = defaultFormatFor(tier, loc)
      if (lf && typeof lf === 'object') {
        // A per-tier format map: use this tier's entry, or the default if absent.
        fmt = lf[tier] ?? defaultFormatFor(tier, loc)
      } else if (typeof lf === 'string' && tier === toValue(options.unit)) {
        // A single format string only styles the base unit's tier.
        fmt = lf
      }
      // Pass `weekStartsOn` so the `w` number token matches the week cell boundary.
      labelFor = (date) => format(date, fmt, { locale: loc, weekStartsOn: toValue(options.weekStartsOn) })
    }

    // First cell boundary at/just left of the window, never before the range.
    let cursor = floorTo(tier, xToDate(lo))
    if (cursor.getTime() < start.getTime()) cursor = floorTo(tier, start)

    const out: GanttColumn[] = []
    let guard = 0
    while (dateToX(cursor) < hi && guard++ < MAX_CELLS) {
      const next = NEXT_BOUNDARY[tier](cursor, 1)
      let x = dateToX(cursor)
      let width = dateToX(next) - x

      // Clamp to [0, contentWidth].
      if (x < 0) {
        width += x
        x = 0
      }
      if (x + width > max) width = max - x

      if (width > 0) {
        out.push({
          key: `${tier}-${cursor.toISOString()}`,
          date: cursor,
          label: labelFor(cursor),
          x,
          width,
          isToday: today ? isWithin(today, cursor, next) : false,
        })
      }
      cursor = next
    }

    return out
  }

  /** All columns for a tier (clamped to the content extent). */
  function columnsFor(tier: GanttUnit): GanttColumn[] {
    return columnsBetween(tier, 0, contentWidth.value)
  }

  const columns = computed<GanttColumn[]>(() => columnsFor(toValue(options.unit)))

  return {
    pxPerDay,
    dateToX,
    widthBetween,
    xToDate,
    snap,
    contentWidth,
    columns,
    columnsFor,
    columnsBetween,
  }
}

/** Whether `date` falls within the half-open cell `[start, end)`. */
function isWithin(date: Date, start: Date, end: Date): boolean {
  const t = date.getTime()
  return t >= start.getTime() && t < end.getTime()
}
