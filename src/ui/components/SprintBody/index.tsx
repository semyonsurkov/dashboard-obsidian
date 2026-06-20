import { useState, useMemo, useEffect, useRef } from 'react'
import { X, Columns3 } from 'lucide-react'
import { Card, ActionIcon } from '@mantine/core'
import type { Tracker, RenderMarkdown } from '../../../types'
import type { SprintInfo } from '../../../stats'
import styles from './styles.module.css'

const DOW_SHORT  = ['Вс','Пн','Вт','Ср','Чт','Пт','Сб']
const DOW_FULL   = ['Воскресенье','Понедельник','Вторник','Среда','Четверг','Пятница','Суббота']
const MONTHS_GEN = ['января','февраля','марта','апреля','мая','июня','июля','августа','сентября','октября','ноября','декабря']

function toISO(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
}
function fmtDay(iso: string) { const [, m, d] = iso.split('-').map(Number); return `${d} ${MONTHS_GEN[m-1]}` }

interface DayCell { date: string; dow: number }

function MdText({ text, filePath, onRenderMarkdown }: {
  text: string
  filePath?: string
  onRenderMarkdown?: RenderMarkdown
}) {
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const el = ref.current
    if (!el || !onRenderMarkdown) return
    el.replaceChildren()
    const cleanup = onRenderMarkdown(el, text, filePath ?? '')
    return () => { if (typeof cleanup === 'function') cleanup() }
  }, [text, filePath, onRenderMarkdown])
  return (
    <div ref={ref} className={styles.detail_text}>
      {!onRenderMarkdown && text}
    </div>
  )
}

interface Props {
  sprint:             SprintInfo
  trackers:           Tracker[]
  onOpenReport?:      (date: string, filePath: string, trackerId: string) => void
  onCreateReport?:    (date: string, trackerId: string) => void
  onRenderMarkdown?:  RenderMarkdown
}

export default function SprintBody({ sprint, trackers, onOpenReport, onCreateReport, onRenderMarkdown }: Props) {
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

  const pathMap = useMemo(
    () => new Map(trackers.map(t => [t.id, new Map(t.days.map(d => [d.date, d.filePath]))])),
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
    const isPast = date < today
    return (
      <div className={styles.detail}>
        <div className={styles.detail_header}>
          <span className={styles.detail_title}>{DOW_FULL[dow]}, {fmtDay(date)}</span>
          <ActionIcon variant="subtle" size="sm" onClick={() => setSelectedDate(null)} aria-label="Закрыть">
            <X size={12} aria-hidden />
          </ActionIcon>
        </div>
        {trackers.map(t => {
          const isOff    = t.weekendsOff && (dow === 0 || dow === 6)
          const reported = reportedSets.get(t.id)?.has(date)
          const text     = textMap.get(t.id)?.get(date) ?? ''
          const filePath = pathMap.get(t.id)?.get(date)
          const isToday  = date === today
          const dotColor = reported ? styles.dot_green : isToday ? styles.dot_future : styles.dot_red

          if (isOff) return (
            <div key={t.id} className={styles.detail_tracker}>
              <div className={styles.detail_tracker_meta}>
                <span className={styles.detail_tracker_name}>{t.label.split(' ')[0]}</span>
                <span className={styles.detail_off_label}>выходной</span>
              </div>
            </div>
          )

          return (
            <div key={t.id} className={styles.detail_tracker}>
              <div className={styles.detail_tracker_meta}>
                <span className={`${styles.tracker_dot} ${dotColor}`} />
                <span className={styles.detail_tracker_name}>{t.label.split(' ')[0]}</span>
                {!reported && !isToday && <span className={styles.detail_miss_label}>пропустил</span>}
                {!reported &&  isToday && <span className={styles.detail_note_inline}>ещё не сдан</span>}
                <div className={styles.detail_actions}>
                  {reported && filePath && (
                    <button
                      className={styles.detail_btn}
                      onClick={() => onOpenReport?.(date, filePath, t.id)}
                    >
                      Открыть
                    </button>
                  )}
                  {!reported && (isToday || isPast) && (
                    <button
                      className={`${styles.detail_btn} ${styles.detail_btn_create}`}
                      onClick={() => onCreateReport?.(date, t.id)}
                    >
                      {isToday ? 'Написать' : 'Создать'}
                    </button>
                  )}
                </div>
              </div>
              {reported && text && <MdText text={text} filePath={filePath} onRenderMarkdown={onRenderMarkdown} />}
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
    <Card withBorder p={0} radius="md">
      <div className={styles.header}>
        <Columns3 size={14} aria-hidden style={{ color: 'var(--mantine-color-dark-2)' }} />
        <span className={styles.header_title}>Дни спринта</span>
      </div>

      <div className={styles.content}>
        {hasData && (
          <div className={styles.rollup}>
            {rollup.map(r => (
              <span key={r.label} className={styles.rollup_badge}>
                {r.label} {r.done}/{r.total}
              </span>
            ))}
          </div>
        )}

        <div className={styles.grid}>
          {sprintDays.map(({ date, dow }) => {
            const isToday    = date === today
            const isFuture   = date > today
            const isSelected = date === selectedDate
            const hasReport  = trackers.some(t => reportedSets.get(t.id)?.has(date))

            const dayClass = [
              styles.day,
              !isFuture && styles.day_clickable,
              isToday   && styles.day_today,
              isFuture  && styles.day_future,
              isSelected && styles.day_selected,
            ].filter(Boolean).join(' ')

            return (
              <div
                key={date}
                className={dayClass}
                onClick={() => handleDayClick(date, isFuture)}
                role={!isFuture ? 'button' : undefined}
                tabIndex={!isFuture ? 0 : undefined}
                onKeyDown={e => e.key === 'Enter' && handleDayClick(date, isFuture)}
                aria-label={!isFuture
                  ? `${DOW_FULL[dow]}, ${fmtDay(date)}${hasReport ? ', сдан' : ', пропущен'}`
                  : undefined}
                aria-expanded={isSelected}
              >
                <div className={styles.day_header}>
                  <span className={styles.day_dow}>{DOW_SHORT[dow]}</span>
                  <span className={styles.day_num}>{date.slice(8)}</span>
                </div>
                <div className={styles.day_dots}>
                  {trackers.map(t => {
                    const isOff = t.weekendsOff && (dow === 0 || dow === 6)
                    if (isOff)    return <span key={t.id} className={`${styles.dot} ${styles.dot_off}`} />
                    if (isFuture) return <span key={t.id} className={`${styles.dot} ${styles.dot_future}`} />
                    const done = reportedSets.get(t.id)?.has(date)
                    if (!done && isToday) return <span key={t.id} className={`${styles.dot} ${styles.dot_future}`} />
                    return <span key={t.id} className={`${styles.dot} ${done ? styles.dot_green : styles.dot_red}`} />
                  })}
                </div>
              </div>
            )
          })}
        </div>

        {selDay && renderDetail(selDay.date, selDay.dow)}
      </div>
    </Card>
  )
}
