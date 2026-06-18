import { useState, useMemo, useEffect, useRef, type MouseEvent } from 'react'
import { Calendar } from '@mantine/dates'
import { daysForMonth } from '../../../stats'
import type { HistoryDay } from '../../../types'
import styles from './styles.module.css'

const MONTHS_GEN = ['января','февраля','марта','апреля','мая','июня','июля','августа','сентября','октября','ноября','декабря']

function toISO(d: Date) {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function fmtShort(iso: string) {
  const [, m, d] = iso.split('-').map(Number)
  return `${d} ${MONTHS_GEN[m - 1]}`
}

interface CtxState {
  x: number; y: number
  date: string
  filePath: string | undefined
  reported: boolean
}

interface Props {
  days:             HistoryDay[]
  since:            string
  onCreateReport?:  (date: string) => void
  onOpenReport?:    (date: string, filePath: string) => void
  onDeleteReport?:  (date: string, filePath: string) => void
}

export default function CalendarHeatmap({ days, since, onCreateReport, onOpenReport, onDeleteReport }: Props) {
  const now  = new Date()
  const [displayMonth, setDisplayMonth] = useState(new Date(now.getFullYear(), now.getMonth(), 1))
  const [ctxMenu, setCtxMenu] = useState<CtxState | null>(null)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!ctxMenu) return
    const close = () => setCtxMenu(null)
    const t = setTimeout(() => document.addEventListener('mousedown', close), 0)
    return () => { clearTimeout(t); document.removeEventListener('mousedown', close) }
  }, [ctxMenu])

  const today      = toISO(now)
  const year       = displayMonth.getFullYear()
  const month      = displayMonth.getMonth()

  const monthDays  = useMemo(() => daysForMonth(days, year, month), [days, year, month])
  const reportedSet = useMemo(() => new Set(monthDays.filter(d => d.reported).map(d => d.date)), [monthDays])
  const pathMap     = useMemo(() => new Map(monthDays.map(d => [d.date, d.filePath])), [monthDays])
  const missedSet   = useMemo(() => {
    const reported = new Set(monthDays.map(d => d.date))
    const daysInMonth = new Date(year, month + 1, 0).getDate()
    const result = new Set<string>()
    for (let n = 1; n <= daysInMonth; n++) {
      const iso = `${year}-${String(month + 1).padStart(2, '0')}-${String(n).padStart(2, '0')}`
      if (iso < today && !reported.has(iso)) result.add(iso)
    }
    return result
  }, [monthDays, year, month, today])

  function handleDayClick(date: Date) {
    const iso = toISO(date)
    if (iso <= today && onCreateReport) {
      onCreateReport(iso)
    }
  }

  return (
    <div className={styles.root}>
      <Calendar
        date={displayMonth}
        onDateChange={setDisplayMonth}
        maxDate={now}
        maxLevel="month"
        size="xs"
        styles={{
          calendarHeader: { maxWidth: 'none' },
          month:          { width: '100%', borderCollapse: 'separate', borderSpacing: '2px' },
          day:            { width: '100%', height: 'auto', aspectRatio: '1', fontSize: '11px' },
          weekday:        { fontSize: '10px' },
        }}
        getDayProps={date => {
          const iso      = toISO(date)
          const isFuture = iso > today
          const reported = reportedSet.has(iso)
          const missed   = missedSet.has(iso)
          return {
            disabled: isFuture,
            onClick:  isFuture ? undefined : () => handleDayClick(date),
            onContextMenu: isFuture ? undefined : (e: MouseEvent<HTMLButtonElement>) => {
              e.preventDefault()
              setCtxMenu({ x: e.clientX, y: e.clientY, date: iso, filePath: pathMap.get(iso), reported: reportedSet.has(iso) })
            },
            style: {
              ...(!isFuture ? { cursor: 'pointer' } : {}),
              ...(reported
                ? { background: '#16a34a', color: 'white', borderRadius: 'var(--radius-sm)' }
                : missed
                ? { background: 'rgba(220,38,38,0.55)', color: 'white', borderRadius: 'var(--radius-sm)' }
                : {}),
            },
          }
        }}
        renderDay={date => <span>{date.getDate()}</span>}
      />

      <div className={styles.legend}>
        <div className={styles.legend_items}>
          <span className={styles.legend_item}>
            <span className={`${styles.legend_dot} ${styles.dot_reported}`} />
            Сдал
          </span>
          <span className={styles.legend_item}>
            <span className={`${styles.legend_dot} ${styles.dot_missed}`} />
            Пропустил
          </span>
        </div>
        <span className={styles.since}>с {fmtShort(since)}</span>
      </div>

      {ctxMenu && (
        <div
          ref={menuRef}
          className={styles.ctx_menu}
          style={{ top: ctxMenu.y, left: Math.min(ctxMenu.x, window.innerWidth - 176) }}
        >
          {ctxMenu.reported && ctxMenu.filePath ? (
            <>
              <button
                className={styles.ctx_item}
                onClick={() => { onOpenReport?.(ctxMenu.date, ctxMenu.filePath!); setCtxMenu(null) }}
              >
                Открыть заметку
              </button>
              <button
                className={`${styles.ctx_item} ${styles.ctx_item_danger}`}
                onClick={() => { onDeleteReport?.(ctxMenu.date, ctxMenu.filePath!); setCtxMenu(null) }}
              >
                Удалить заметку
              </button>
            </>
          ) : (
            <button
              className={styles.ctx_item}
              onClick={() => { onCreateReport?.(ctxMenu.date); setCtxMenu(null) }}
            >
              Создать отчёт
            </button>
          )}
        </div>
      )}
    </div>
  )
}
