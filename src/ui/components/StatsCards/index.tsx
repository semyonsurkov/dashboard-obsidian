import { useMemo } from 'react'
import { Flame, Award, BarChart2, CalendarDays, CheckCircle, XCircle } from 'lucide-react'
import { calcStats, rollupForRange } from '../../../stats'
import type { HistoryDay, RangeMode } from '../../../types'
import styles from './styles.module.css'

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
        <div className={styles.card}>
          <div className={styles.header}><span className={styles.label}>Сдал</span><CheckCircle size={13} aria-hidden className="icon_green" /></div>
          <div className={styles.value} data-tone="green">{rollup.reported}</div>
          <div className={styles.sub}>за спринт</div>
        </div>
        <div className={styles.card}>
          <div className={styles.header}><span className={styles.label}>Пропустил</span><XCircle size={13} aria-hidden className="icon_muted" /></div>
          <div className={styles.value}>{rollup.missed}</div>
          <div className={styles.sub}>за спринт</div>
        </div>
        <div className={styles.card}>
          <div className={styles.header}><span className={styles.label}>% спринта</span><BarChart2 size={13} aria-hidden className="icon_purple" /></div>
          <div className={styles.value}>{rollup.pct}%</div>
          <div className={styles.sub}>{rollup.total} дней учтено</div>
        </div>
        <div className={styles.card}>
          <div className={styles.header}><span className={styles.label}>Серия</span><Flame size={13} aria-hidden className="icon_orange" /></div>
          <div className={styles.value} data-tone="orange">{s.streak}</div>
          <div className={styles.sub}>дней подряд</div>
        </div>
      </div>
    )
  }

  return (
    <div className={styles.grid}>
      <div className={styles.card}>
        <div className={styles.header}><span className={styles.label}>Серия</span><Flame size={13} aria-hidden className="icon_orange" /></div>
        <div className={styles.value} data-tone="orange">{s.streak}</div>
        <div className={styles.sub}>дней подряд</div>
      </div>
      <div className={styles.card}>
        <div className={styles.header}><span className={styles.label}>Рекорд</span><Award size={13} aria-hidden className="icon_amber" /></div>
        <div className={styles.value} data-tone="amber">{s.bestStreak}</div>
        <div className={styles.sub}>дней подряд</div>
      </div>
      <div className={styles.card}>
        <div className={styles.header}><span className={styles.label}>% сдачи</span><BarChart2 size={13} aria-hidden className="icon_purple" /></div>
        <div className={styles.value}>{s.attendance}%</div>
        <div className={styles.sub}>за всё время</div>
      </div>
      <div className={styles.card}>
        <div className={styles.header}><span className={styles.label}>Всего</span><CalendarDays size={13} aria-hidden className="icon_green" /></div>
        <div className={styles.value} data-tone="green">{s.total}</div>
        <div className={styles.sub}>записей</div>
      </div>
    </div>
  )
}
