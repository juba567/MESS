import type { ISODate, Month } from './types'

const MONTH_NAMES = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
]
const MONTH_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const DAY_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

/** Local YYYY-MM-DD (avoids UTC off-by-one from toISOString). */
export function toISODate(d: Date): ISODate {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export function todayISO(): ISODate {
  return toISODate(new Date())
}

export function parseISO(s: ISODate): Date {
  const [y, m, d] = s.split('-').map(Number)
  return new Date(y, (m || 1) - 1, d || 1)
}

export function monthOf(s: ISODate): Month {
  return s.slice(0, 7)
}

export function currentMonth(): Month {
  return todayISO().slice(0, 7)
}

export function addDays(s: ISODate, n: number): ISODate {
  const d = parseISO(s)
  d.setDate(d.getDate() + n)
  return toISODate(d)
}

export function tomorrowISO(): ISODate {
  return addDays(todayISO(), 1)
}

export function monthLabel(month: Month): string {
  const [y, m] = month.split('-').map(Number)
  return `${MONTH_NAMES[(m || 1) - 1]} ${y}`
}

export function shortDate(s: ISODate): string {
  const d = parseISO(s)
  return `${d.getDate()} ${MONTH_SHORT[d.getMonth()]}`
}

export function longDate(s: ISODate): string {
  const d = parseISO(s)
  return `${DAY_SHORT[d.getDay()]}, ${d.getDate()} ${MONTH_SHORT[d.getMonth()]} ${d.getFullYear()}`
}

export function relativeTime(iso: string): string {
  const then = new Date(iso).getTime()
  const now = Date.now()
  const diff = Math.max(0, now - then)
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  const days = Math.floor(hrs / 24)
  if (days < 7) return `${days}d ago`
  return shortDate(toISODate(new Date(then)))
}

export function addMonths(month: Month, n: number): Month {
  const [y, m] = month.split('-').map(Number)
  const d = new Date(y, m - 1 + n, 1)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

export function daysInMonth(month: Month): number {
  const [y, m] = month.split('-').map(Number)
  return new Date(y, m, 0).getDate()
}

/** First weekday (0=Sun) of a month. */
export function firstWeekday(month: Month): number {
  const [y, m] = month.split('-').map(Number)
  return new Date(y, m - 1, 1).getDay()
}

export function dateInMonth(date: ISODate, month: Month): boolean {
  return date.slice(0, 7) === month
}

/** Inclusive check that `date` falls within [start, end]. */
export function betweenInclusive(date: ISODate, start: ISODate, end: ISODate): boolean {
  return date >= start && date <= end
}

export function eachDay(month: Month): ISODate[] {
  const n = daysInMonth(month)
  const out: ISODate[] = []
  for (let i = 1; i <= n; i++) {
    out.push(`${month}-${String(i).padStart(2, '0')}`)
  }
  return out
}

export { MONTH_NAMES, MONTH_SHORT, DAY_SHORT }
