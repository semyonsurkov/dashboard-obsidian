import { useState, useMemo } from 'react'
import { CalendarDays, CheckCircle, XCircle, ArrowUpDown, ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from '@/ui/components/ui/button'
import { groupByMonth } from '../../../stats'
import type { HistoryDay, Preset } from '../../../types'
import styles from './styles.module.css'

const MONTHS_NOM = ['Январь','Февраль','Март','Апрель','Май','Июнь','Июль','Август','Сентябрь','Октябрь','Ноябрь','Декабрь']
const MONTHS_GEN = ['января','февраля','марта','апреля','мая','июня','июля','августа','сентября','октября','ноября','декабря']

function toISO(d: Date) { return d.toISOString().slice(0, 10) }
function daysAgo(n: number) { const d = new Date(); d.setDate(d.getDate() - n); return toISO(d) }
function fmtShort(iso: string) { const [, m, d] = iso.split('-').map(Number); return `${d} ${MONTHS_GEN[m - 1]}` }

function DayRow({ entry, onOpen }: { entry: HistoryDay; onOpen?: (path: string) => void }) {
  const [, m, d] = entry.date.split('-').map(Number)
  const label = `${d} ${MONTHS_GEN[m - 1]}`
  const clickable = entry.reported && !!entry.filePath && !!onOpen

  if (entry.reported) {
    return (
      <div
        className={`${styles.row} ${styles.row_ok}${clickable ? ` ${styles.row_link}` : ''}`}
        role="listitem"
        tabIndex={clickable ? 0 : undefined}
        onClick={clickable ? () => onOpen!(entry.filePath!) : undefined}
        onKeyDown={clickable ? e => e.key === 'Enter' && onOpen!(entry.filePath!) : undefined}
        aria-label={clickable ? `Открыть заметку за ${label}` : undefined}
      >
        <div className={styles.row_head}>
          <span className="dot dot_green" />
          <span className={styles.row_date}>{label}</span>
        </div>
        {entry.text && (
          <p className={styles.row_text}>
            {entry.text.slice(0, 140)}{entry.text.length > 140 ? '…' : ''}
          </p>
        )}
      </div>
    )
  }
  return (
    <div className={`${styles.row} ${styles.row_miss}`} role="listitem">
      <span className="dot dot_dim" />
      <span className={styles.row_dim}>{label}</span>
      <span className={styles.row_miss_label}>пропустил</span>
    </div>
  )
}

interface Props {
  sourceDays:  HistoryDay[]
  onOpenDay?:  (filePath: string) => void
}

export default function TimelineBlock({ sourceDays, onOpenDay }: Props) {
  const [preset, setPreset]           = useState<Preset>('month')
  const [newestFirst, setNewestFirst] = useState(true)
  const now = new Date()
  const [viewYear, setViewYear]   = useState(now.getFullYear())
  const [viewMonth, setViewMonth] = useState(now.getMonth())

  const today  = toISO(now)
  const dayMap = useMemo(() => new Map(sourceDays.map(d => [d.date, d])), [sourceDays])

  const allDays = useMemo<HistoryDay[]>(() => {
    let from: string
    let to: string

    if (preset === 'week') {
      from = daysAgo(6)
      to   = today
    } else if (preset === 'month') {
      const y = viewYear, m = viewMonth
      from = `${y}-${String(m + 1).padStart(2, '0')}-01`
      const lastDay = new Date(y, m + 1, 0).getDate()
      to   = `${y}-${String(m + 1).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`
      if (to > today) to = today
    } else {
      from = sourceDays.length > 0 ? sourceDays[0].date : daysAgo(90)
      to   = today
    }

    const result: HistoryDay[] = []
    const cur = new Date(from + 'T12:00:00')
    const end = new Date(to + 'T12:00:00')
    while (cur <= end) {
      const iso = toISO(cur)
      const r   = dayMap.get(iso)
      result.push({ date: iso, reported: !!r?.reported, text: r?.text ?? '' })
      cur.setDate(cur.getDate() + 1)
    }
    return result
  }, [preset, viewYear, viewMonth, today, sourceDays, dayMap])

  const reported = useMemo(() => allDays.filter(d => d.reported), [allDays])
  const missed   = useMemo(() => allDays.filter(d => !d.reported), [allDays])
  const pct      = allDays.length ? Math.round(reported.length / allDays.length * 100) : 0

  const monthGroups = useMemo(
    () => preset === 'all' ? groupByMonth(allDays) : [],
    [preset, allDays],
  )

  const displayed = useMemo(
    () => newestFirst ? [...allDays].reverse() : allDays,
    [allDays, newestFirst],
  )

  function shiftMonth(delta: number) {
    const d = new Date(viewYear, viewMonth + delta, 1)
    setViewYear(d.getFullYear()); setViewMonth(d.getMonth())
  }

  const monthLabel     = `${MONTHS_NOM[viewMonth]} ${viewYear}`
  const isCurrentMonth = viewYear === now.getFullYear() && viewMonth === now.getMonth()

  return (
    <div className="db_card">
      <div className={styles.header}>
        <CalendarDays size={14} aria-hidden className="icon_muted" />
        <span className={styles.title}>История</span>
      </div>

      <div className={styles.preset_row}>
        {(['week', 'month', 'all'] as Preset[]).map(p => (
          <button
            key={p}
            className={`btn btn--seg btn--sm btn--pill${preset === p ? ' is_active' : ''}`}
            onClick={() => setPreset(p)}
          >
            {p === 'week' ? 'Неделя' : p === 'month' ? 'Месяц' : 'Всё время'}
          </button>
        ))}

        {preset === 'month' && (
          <div className={styles.month_nav}>
            <Button variant="ghost" size="sm" onClick={() => shiftMonth(-1)} aria-label="Предыдущий месяц">
              <ChevronLeft size={13} aria-hidden />
            </Button>
            <span className={styles.month_label}>{monthLabel}</span>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => shiftMonth(1)}
              disabled={isCurrentMonth}
              aria-label="Следующий месяц"
            >
              <ChevronRight size={13} aria-hidden />
            </Button>
          </div>
        )}
      </div>

      <div className={styles.stats_box}>
        <div className={styles.pills}>
          <div className={`${styles.pill} ${styles.pill_green}`}>
            <CheckCircle size={13} aria-hidden className={styles.pill_icon} />
            <div>
              <div className={styles.pill_val}>{reported.length} написал</div>
              <div className={styles.pill_sub}>
                {preset === 'week'
                  ? `${fmtShort(daysAgo(6))} — ${fmtShort(today)}`
                  : preset === 'month'
                  ? monthLabel
                  : 'за всё время'}
              </div>
            </div>
          </div>
          <div className={`${styles.pill} ${styles.pill_red}`}>
            <XCircle size={13} aria-hidden className={styles.pill_icon} />
            <div>
              <div className={styles.pill_val}>{missed.length} пропустил</div>
              <div className={styles.pill_sub}>из {allDays.length} дней</div>
            </div>
          </div>
        </div>

      </div>

      <div className={styles.meta}>
        <span>{pct}% сдачи</span>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setNewestFirst(v => !v)}
          aria-label="Изменить порядок"
        >
          <ArrowUpDown size={12} aria-hidden />
          {newestFirst ? 'Новые сначала' : 'Старые сначала'}
        </Button>
      </div>

      <div className={styles.day_list} role="list">
        {preset === 'all' ? (
          monthGroups.map(group => {
            const groupDays = newestFirst ? [...group.days].reverse() : group.days
            return (
              <div key={group.key}>
                <div className={styles.month_header}>
                  {MONTHS_NOM[group.month]} {group.year}
                  <span className={styles.month_count}>
                    {group.days.filter(d => d.reported).length}/{group.days.length}
                  </span>
                </div>
                {groupDays.map(entry => <DayRow key={entry.date} entry={entry} onOpen={onOpenDay} />)}
              </div>
            )
          })
        ) : (
          displayed.map(entry => <DayRow key={entry.date} entry={entry} onOpen={onOpenDay} />)
        )}
      </div>
    </div>
  )
}
