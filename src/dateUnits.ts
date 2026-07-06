import {
  endOfDay,
  endOfHour,
  endOfMinute,
  endOfMonth,
  endOfQuarter,
  endOfWeek,
  endOfYear,
  startOfDay,
  startOfHour,
  startOfMinute,
  startOfMonth,
  startOfQuarter,
  startOfWeek,
  startOfYear,
} from 'date-fns'
import type { Day, Locale } from 'date-fns'
import type { GanttUnit } from './types'

/** Week-boundary options: an explicit `weekStartsOn` wins over the locale. */
export interface WeekBoundaryOptions {
  weekStartsOn?: Day
  locale?: Locale
}

/** Snap `date` down to the start of its enclosing `unit` (day is the fallback). */
export function floorToUnit(date: Date, unit: GanttUnit, week?: WeekBoundaryOptions): Date {
  switch (unit) {
    case 'year':
      return startOfYear(date)
    case 'quarter':
      return startOfQuarter(date)
    case 'month':
      return startOfMonth(date)
    case 'week':
      return startOfWeek(date, week)
    case 'hour':
      return startOfHour(date)
    case 'minute':
      return startOfMinute(date)
    default:
      return startOfDay(date)
  }
}

/** Snap `date` up to the end of its enclosing `unit` (day is the fallback). */
export function ceilToUnit(date: Date, unit: GanttUnit, week?: WeekBoundaryOptions): Date {
  switch (unit) {
    case 'year':
      return endOfYear(date)
    case 'quarter':
      return endOfQuarter(date)
    case 'month':
      return endOfMonth(date)
    case 'week':
      return endOfWeek(date, week)
    case 'hour':
      return endOfHour(date)
    case 'minute':
      return endOfMinute(date)
    default:
      return endOfDay(date)
  }
}
