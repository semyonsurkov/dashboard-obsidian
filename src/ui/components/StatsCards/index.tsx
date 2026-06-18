import { useMemo } from 'react'
import { Flame, Award, BarChart2, CalendarDays, CheckCircle, XCircle } from 'lucide-react'
import { calcStats, rollupForRange } from '../../../stats'
import type { HistoryDay, RangeMode } from '../../../types'
import styles from './styles.module.css'

function StatCard({
  label,
  value,
  sub,
  icon,
  tone,
}: {
  label: string
  value: string | number
  sub: string
  icon: React.ReactNode
  tone?: 'green' | 'orange' | 'amber'
}) {
  const valueClass = tone === 'green'
    ? styles.value_green
    : tone === 'orange'
    ? styles.value_orange
    : tone === 'amber'
    ? styles.value_amber
    : styles.value

  return (
    <div className={styles.card}>
      <div className={styles.card_header}>
        <span className={styles.label}>{label}</span>
        {icon}
      </div>
      <div className={`${styles.value} ${valueClass}`}>{value}</div>
      <div className={styles.sub}>{sub}</div>
    </div>
  )
}

interface Props {
  days:        HistoryDay[]
  weekendsOff: boolean
  rangeMode:   RangeMode
  sprintStart: string
  sprintEnd:   string
  today:       string
}

export default function StatsCards({ days, weekendsOff, rangeMode, sprintStart, sprintEnd, today }: Props) {
  const s      = useMemo(() => calcStats(days, weekendsOff), [days, weekendsOff])
  const rollup = useMemo(
    () => rangeMode === 'sprint' ? rollupForRange(days, sprintStart, sprintEnd, today, weekendsOff) : null,
    [days, rangeMode, sprintStart, sprintEnd, today, weekendsOff],
  )

  if (rangeMode === 'sprint' && rollup) {
    return (
      <div className={styles.grid}>
        <StatCard label="Сдал" value={rollup.reported} sub="за спринт" tone="green" icon={<CheckCircle size={13} aria-hidden style={{ color: 'var(--mantine-color-green-4)' }} />} />
        <StatCard label="Пропустил" value={rollup.missed} sub="за спринт" icon={<XCircle size={13} aria-hidden style={{ color: 'var(--mantine-color-dark-2)' }} />} />
        <StatCard label="% спринта" value={`${rollup.pct}%`} sub={`${rollup.total} дней учтено`} icon={<BarChart2 size={13} aria-hidden style={{ color: 'var(--mantine-color-blue-5)' }} />} />
        <StatCard label="Серия" value={s.streak} sub="дней подряд" tone="orange" icon={<Flame size={13} aria-hidden style={{ color: '#f97316' }} />} />
      </div>
    )
  }

  return (
    <div className={styles.grid}>
      <StatCard label="Серия" value={s.streak} sub="дней подряд" tone="orange" icon={<Flame size={13} aria-hidden style={{ color: '#f97316' }} />} />
      <StatCard label="Рекорд" value={s.bestStreak} sub="дней подряд" tone="amber" icon={<Award size={13} aria-hidden style={{ color: 'var(--mantine-color-amber-4)' }} />} />
      <StatCard label="% сдачи" value={`${s.attendance}%`} sub="за всё время" icon={<BarChart2 size={13} aria-hidden style={{ color: 'var(--mantine-color-blue-5)' }} />} />
      <StatCard label="Всего" value={s.total} sub="записей" tone="green" icon={<CalendarDays size={13} aria-hidden style={{ color: 'var(--mantine-color-green-4)' }} />} />
    </div>
  )
}
