import { useState, useMemo, useEffect, useRef, type MouseEvent } from 'react'
import { createPortal } from 'react-dom'
import { Calendar } from '@mantine/dates'
import { ActionIcon } from '@mantine/core'
import { ChevronLeft } from 'lucide-react'
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
  const [calLevel, setCalLevel] = useState<'month' | 'year' | 'decade'>('month')
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

  const pickerYear  = displayMonth.getFullYear()
  const MONTHS_SHORT = ['янв','фев','мар','апр','май','июн','июл','авг','сен','окт','ноя','дек']

  if (calLevel !== 'month') {
    return (
      <div className={styles.root}>
        <div className={styles.picker_header}>
          <ActionIcon variant="subtle" size="sm" onClick={() => setCalLevel('month')} aria-label="Назад">
            <ChevronLeft size={14} />
          </ActionIcon>
          <button
            className={styles.picker_year_btn}
            onClick={() => setDisplayMonth(d => new Date(d.getFullYear() - 1, d.getMonth(), 1))}
            aria-label="Предыдущий год"
          >‹</button>
          <span className={styles.picker_year}>{pickerYear}</span>
          <button
            className={styles.picker_year_btn}
            onClick={() => {
              const next = new Date(displayMonth.getFullYear() + 1, displayMonth.getMonth(), 1)
              if (next <= now) setDisplayMonth(next)
            }}
            aria-label="Следующий год"
            disabled={pickerYear >= now.getFullYear()}
          >›</button>
        </div>
        <div className={styles.month_grid}>
          {MONTHS_SHORT.map((name, i) => {
            const isDisabled = new Date(pickerYear, i, 1) > now
            const isCurrent  = i === displayMonth.getMonth() && pickerYear === displayMonth.getFullYear()
            return (
              <button
                key={i}
                className={`${styles.month_cell}${isCurrent ? ` ${styles.month_cell_active}` : ''}`}
                disabled={isDisabled}
                onClick={() => { setDisplayMonth(new Date(pickerYear, i, 1)); setCalLevel('month') }}
              >
                {name}
              </button>
            )
          })}
        </div>
      </div>
    )
  }

  return (
    <div className={styles.root}>
      <Calendar
        date={displayMonth}
        onDateChange={setDisplayMonth}
        level={calLevel}
        onLevelChange={setCalLevel}
        maxDate={now}
        size="xs"
        styles={{
          calendarHeader: { maxWidth: 'none', width: '100%' },
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
                ? { background: 'rgba(34,197,94,0.32)', color: 'var(--mantine-color-green-2)', borderRadius: 'var(--radius-sm)' }
                : missed
                ? { background: 'rgba(239,68,68,0.28)', color: 'var(--mantine-color-red-3)', borderRadius: 'var(--radius-sm)' }
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

      {ctxMenu && createPortal(
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
        </div>,
        document.body
      )}
    </div>
  )
}
