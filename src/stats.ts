import type { HistoryDay, TrackerStats } from './types'

function toISO(d: Date) {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

// ─── Stats ─────────────────────────────────────────────────────────────────────

export function calcStats(days: HistoryDay[], weekendsOff = false): TrackerStats {
  const today    = toISO(new Date())
  const reported = new Set(days.filter(d => d.reported).map(d => d.date))

  const allDates: string[] = []
  if (days.length > 0) {
    const cur = new Date(days[0].date + 'T12:00:00')
    const end = new Date(today + 'T12:00:00')
    while (cur <= end) {
      const iso = toISO(cur)
      const dow = cur.getDay()
      if (!weekendsOff || (dow !== 0 && dow !== 6)) allDates.push(iso)
      cur.setDate(cur.getDate() + 1)
    }
  }

  let streak = 0
  for (let i = allDates.length - 1; i >= 0; i--) {
    if (allDates[i] > today) continue
    if (allDates[i] === today && !reported.has(allDates[i])) continue
    if (reported.has(allDates[i])) streak++
    else break
  }

  let best = 0, run = 0
  for (const d of allDates) {
    if (reported.has(d)) { run++; if (run > best) best = run }
    else run = 0
  }

  const countable  = allDates.filter(d => d < today || reported.has(d))
  const eligRep    = countable.filter(d => reported.has(d)).length
  const attendance = countable.length ? Math.round(eligRep / countable.length * 100) : 0

  const sorted           = [...reported].sort()
  const lastReportedDate = sorted[sorted.length - 1] ?? null
  const daysSinceLast    = lastReportedDate
    ? Math.round((new Date(today).getTime() - new Date(lastReportedDate).getTime()) / 86400000)
    : null

  return { streak, bestStreak: best, total: reported.size, attendance, lastReportedDate, daysSinceLast }
}

export function daysForMonth(days: HistoryDay[], year: number, month: number): HistoryDay[] {
  const prefix = `${year}-${String(month + 1).padStart(2, '0')}-`
  return days.filter(d => d.date.startsWith(prefix))
}

// ─── Sprint ────────────────────────────────────────────────────────────────────

export interface SprintInfo {
  weekNumber:  number
  year:        number
  number:      number   // alias of weekNumber
  start:       string   // ISO YYYY-MM-DD (Monday)
  end:         string   // ISO YYYY-MM-DD (Sunday)
  daysLeft:    number
  daysElapsed: number
  progress:    number   // 0–100
  lengthDays:  number   // always 7
  state:       'past' | 'active' | 'future'
}

export function isoWeek(iso: string): { week: number; year: number } {
  const d = new Date(iso + 'T12:00:00')
  const day = d.getDay() || 7
  d.setDate(d.getDate() + 4 - day)
  const jan1 = new Date(d.getFullYear(), 0, 1, 12, 0, 0)
  return { week: Math.ceil(((d.getTime() - jan1.getTime()) / 86400000 + 1) / 7), year: d.getFullYear() }
}

export function sprintByOffset(today: string, weekOffset: number): SprintInfo {
  const todayDate = new Date(today + 'T12:00:00')
  const dow = (todayDate.getDay() + 6) % 7
  const monday = new Date(todayDate)
  monday.setDate(todayDate.getDate() - dow + weekOffset * 7)
  const sunday = new Date(monday)
  sunday.setDate(monday.getDate() + 6)

  const start = toISO(monday)
  const end   = toISO(sunday)
  const { week: weekNumber, year } = isoWeek(start)

  const state: 'past' | 'active' | 'future' = end < today ? 'past' : start > today ? 'future' : 'active'

  let daysElapsed = 0, daysLeft = 7, progress = 0
  if (state === 'active') {
    daysElapsed = Math.floor((todayDate.getTime() - monday.getTime()) / 86400000)
    daysLeft    = Math.max(0, 6 - daysElapsed)
    progress    = Math.min(100, Math.round((daysElapsed + 1) / 7 * 100))
  } else if (state === 'past') {
    daysElapsed = 7; daysLeft = 0; progress = 100
  }

  return { weekNumber, year, number: weekNumber, start, end, daysLeft, daysElapsed, progress, lengthDays: 7, state }
}

export function daysLeftUntil(deadline: string, today: string): number {
  const d = new Date(deadline + 'T12:00:00')
  const t = new Date(today + 'T12:00:00')
  return Math.max(0, Math.ceil((d.getTime() - t.getTime()) / 86400000))
}

export function deadlineProgress(since: string, deadline: string, today: string): number {
  const s = new Date(since + 'T12:00:00').getTime()
  const e = new Date(deadline + 'T12:00:00').getTime()
  const t = new Date(today + 'T12:00:00').getTime()
  const total = e - s
  if (total <= 0) return 100
  return Math.min(100, Math.max(0, Math.round((t - s) / total * 100)))
}

export interface RangeRollup {
  reported: number
  missed:   number
  total:    number
  pct:      number
}

export function rollupForRange(
  days: HistoryDay[],
  start: string,
  end: string,
  today: string,
  weekendsOff = false,
): RangeRollup {
  const dayMap  = new Map(days.map(d => [d.date, d]))
  const pastEnd = today < end ? today : end
  const result: HistoryDay[] = []
  const cur     = new Date(start + 'T12:00:00')
  const endDate = new Date(pastEnd + 'T12:00:00')
  while (cur <= endDate) {
    const iso = toISO(cur)
    const dow = cur.getDay()
    if (!weekendsOff || (dow !== 0 && dow !== 6)) {
      const d = dayMap.get(iso)
      result.push({ date: iso, reported: !!d?.reported, text: d?.text ?? '' })
    }
    cur.setDate(cur.getDate() + 1)
  }
  const reported = result.filter(d => d.reported).length
  const missed   = result.filter(d => !d.reported && d.date < today).length
  const total    = result.length
  const pct      = total ? Math.round(reported / total * 100) : 0
  return { reported, missed, total, pct }
}

// ─── History grouping ──────────────────────────────────────────────────────────

export interface MonthGroup {
  key:   string    // YYYY-MM
  year:  number
  month: number    // 0-based
  days:  HistoryDay[]
}

export function groupByMonth(days: HistoryDay[]): MonthGroup[] {
  const map = new Map<string, HistoryDay[]>()
  for (const d of days) {
    const key = d.date.slice(0, 7)
    if (!map.has(key)) map.set(key, [])
    map.get(key)!.push(d)
  }
  return Array.from(map.entries())
    .map(([key, daysArr]) => {
      const [y, mo] = key.split('-').map(Number)
      return { key, year: y, month: mo - 1, days: daysArr }
    })
    .sort((a, b) => b.key.localeCompare(a.key))
}
