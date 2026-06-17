import { useState, useMemo } from 'react'
import type { Tracker } from '../../../types'
import type { SprintInfo } from '../../../stats'
import styles from './styles.module.css'

const DOW_SHORT  = ['Вс','Пн','Вт','Ср','Чт','Пт','Сб']
const DOW_FULL   = ['Воскресенье','Понедельник','Вторник','Среда','Четверг','Пятница','Суббота']
const MONTHS_GEN = ['января','февраля','марта','апреля','мая','июня','июля','августа','сентября','октября','ноября','декабря']

function toISO(d: Date) { return d.toISOString().slice(0, 10) }
function fmtDay(iso: string) { const [,m,d] = iso.split('-').map(Number); return `${d} ${MONTHS_GEN[m-1]}` }

interface DayCell { date: string; dow: number }

interface Props {
  sprint:   SprintInfo
  trackers: Tracker[]
}

export default function SprintBody({ sprint, trackers }: Props) {
  const today = toISO(new Date())
  const [selectedDate, setSelectedDate] = useState<string | null>(null)

  const sprintDays = useMemo<DayCell[]>(() => {
    const result: DayCell[] = []
    const cur = new Date(sprint.start + 'T12:00:00')
    const end = new Date(sprint.end + 'T12:00:00')
    while (cur <= end) {
      result.push({ date: toISO(cur), dow: cur.getDay() })
      cur.setDate(cur.getDate() + 1)
    }
    return result
  }, [sprint])

  const reportedSets = useMemo(
    () => new Map(trackers.map(t => [t.id, new Set(t.days.filter(d => d.reported).map(d => d.date))])),
    [trackers],
  )

  const textMap = useMemo(
    () => new Map(trackers.map(t => [t.id, new Map(t.days.map(d => [d.date, d.text]))])),
    [trackers],
  )

  function weekRollup(days: DayCell[]) {
    return trackers.map(t => {
      const eligible = days.filter(d => !(t.weekendsOff && (d.dow === 0 || d.dow === 6)) && d.date <= today)
      const done     = eligible.filter(d => reportedSets.get(t.id)?.has(d.date)).length
      return { label: t.label.split(' ')[0], done, total: eligible.length }
    })
  }

  function handleDayClick(date: string, isFuture: boolean) {
    if (isFuture) return
    setSelectedDate(prev => prev === date ? null : date)
  }

  function renderDetail(date: string, dow: number) {
    return (
      <div className={styles.detail}>
        <div className={styles.detail_hdr}>
          <span className={styles.detail_title}>{DOW_FULL[dow]}, {fmtDay(date)}</span>
          <button className={styles.detail_close} onClick={() => setSelectedDate(null)} aria-label="Закрыть">✕</button>
        </div>
        {trackers.map(t => {
          const isOff    = t.weekendsOff && (dow === 0 || dow === 6)
          const reported = reportedSets.get(t.id)?.has(date)
          const text     = textMap.get(t.id)?.get(date) ?? ''

          if (isOff) return (
            <div key={t.id} className={styles.detail_row}>
              <div className={styles.detail_row_hdr}>
                <span className={styles.detail_label}>{t.label.split(' ')[0]}</span>
                <span className={styles.detail_off}>выходной</span>
              </div>
            </div>
          )
          return (
            <div key={t.id} className={styles.detail_row}>
              <div className={styles.detail_row_hdr}>
                <span className={`${styles.dot} ${reported ? styles.dot_ok : styles.dot_miss}`} />
                <span className={styles.detail_label}>{t.label.split(' ')[0]}</span>
                {!reported && <span className={styles.detail_skip}>пропустил</span>}
              </div>
              {reported && text && <p className={styles.detail_text}>{text}</p>}
              {reported && !text && <p className={styles.detail_empty}>Отчёт сдан, текст не сохранён</p>}
            </div>
          )
        })}
      </div>
    )
  }

  const rollup  = weekRollup(sprintDays)
  const hasData = sprintDays.some(d => d.date <= today)
  const selDay  = sprintDays.find(d => d.date === selectedDate)

  return (
    <div className={`db_card ${styles.body}`}>
      {hasData && (
        <div className={styles.week_hdr}>
          <div className={styles.rollup}>
            {rollup.map(r => (
              <span key={r.label} className={styles.rollup_item}>
                {r.label} {r.done}/{r.total}
              </span>
            ))}
          </div>
        </div>
      )}

      <div className={styles.grid}>
        {sprintDays.map(({ date, dow }) => {
          const isToday    = date === today
          const isFuture   = date > today
          const isSelected = date === selectedDate
          const hasReport  = trackers.some(t => reportedSets.get(t.id)?.has(date))

          let cellCls = styles.cell
          if (isToday)    cellCls += ` ${styles.today}`
          if (isFuture)   cellCls += ` ${styles.future}`
          if (isSelected) cellCls += ` ${styles.selected}`
          if (!isFuture)  cellCls += ` ${styles.clickable}`

          return (
            <div
              key={date}
              className={cellCls}
              onClick={() => handleDayClick(date, isFuture)}
              role={!isFuture ? 'button' : undefined}
              tabIndex={!isFuture ? 0 : undefined}
              onKeyDown={e => e.key === 'Enter' && handleDayClick(date, isFuture)}
              aria-label={!isFuture ? `${DOW_FULL[dow]}, ${fmtDay(date)}${hasReport ? ', сдан' : ', пропустил'}` : undefined}
              aria-expanded={isSelected}
            >
              <div className={styles.cell_top}>
                <span className={styles.cell_dow}>{DOW_SHORT[dow]}</span>
                <span className={styles.cell_day}>{date.slice(8)}</span>
              </div>
              <div className={styles.dots}>
                {trackers.map(t => {
                  const isOff = t.weekendsOff && (dow === 0 || dow === 6)
                  if (isOff)    return <span key={t.id} className={`${styles.dot} ${styles.dot_skip}`} />
                  if (isFuture) return <span key={t.id} className={`${styles.dot} ${styles.dot_future}`} />
                  const done = reportedSets.get(t.id)?.has(date)
                  return <span key={t.id} className={`${styles.dot} ${done ? styles.dot_ok : styles.dot_miss}`} />
                })}
              </div>
            </div>
          )
        })}
      </div>

      {selDay && renderDetail(selDay.date, selDay.dow)}
    </div>
  )
}
