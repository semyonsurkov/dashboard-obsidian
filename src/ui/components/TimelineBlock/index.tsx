import { useState, useMemo, useRef, useEffect, type MouseEvent } from 'react'
import { createPortal } from 'react-dom'
import { CalendarDays, CheckCircle, XCircle, ArrowUpDown, ChevronDown, ChevronLeft, ChevronRight } from 'lucide-react'
import { Card, ActionIcon, SegmentedControl, UnstyledButton } from '@mantine/core'
import { groupByMonth } from '../../../stats'
import type { HistoryDay, Preset, RenderMarkdown } from '../../../types'
import styles from './styles.module.css'

const MONTHS_NOM = ['Январь','Февраль','Март','Апрель','Май','Июнь','Июль','Август','Сентябрь','Октябрь','Ноябрь','Декабрь']
const MONTHS_GEN = ['января','февраля','марта','апреля','мая','июня','июля','августа','сентября','октября','ноября','декабря']

const DOW = ['Вс','Пн','Вт','Ср','Чт','Пт','Сб']

const PRESET_DATA = [
  { value: 'week',  label: 'Неделя'    },
  { value: 'month', label: 'Месяц'     },
  { value: 'all',   label: 'Всё время' },
]

function toISO(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
}
function daysAgo(n: number) { const d = new Date(); d.setDate(d.getDate() - n); return toISO(d) }
function fmtShort(iso: string) { const [, m, d] = iso.split('-').map(Number); return `${d} ${MONTHS_GEN[m - 1]}` }

interface CtxState { x: number; y: number; date: string; filePath: string | undefined; reported: boolean }

interface DayRowProps {
  entry:           HistoryDay
  onOpenByDate?:   (date: string) => void
  onContextMenu?:  (e: MouseEvent<HTMLDivElement>, date: string, filePath: string | undefined, reported: boolean) => void
  onRenderMarkdown?: RenderMarkdown
}

function MarkdownBody({ entry, onRenderMarkdown }: {
  entry: HistoryDay
  onRenderMarkdown?: RenderMarkdown
}) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [expanded, setExpanded]   = useState(false)
  const [overflows, setOverflows] = useState(
    !onRenderMarkdown && (entry.text.length > 160 || entry.text.includes('\n'))
  )

  useEffect(() => {
    const container = containerRef.current
    if (!container || !onRenderMarkdown) return

    container.replaceChildren()
    setExpanded(false)
    const cleanup = onRenderMarkdown(container, entry.text, entry.filePath ?? '')

    const timer = setTimeout(() => {
      if (containerRef.current) {
        setOverflows(containerRef.current.scrollHeight > containerRef.current.clientHeight + 2)
      }
    }, 0)

    return () => {
      clearTimeout(timer)
      if (typeof cleanup === 'function') cleanup()
    }
  }, [entry.filePath, entry.text, onRenderMarkdown])

  return (
    <>
      <div
        ref={containerRef}
        className={`${styles.day_markdown}${expanded ? ` ${styles.day_markdown_expanded}` : ''}`}
        onClick={e => e.stopPropagation()}
        onKeyDown={e => e.stopPropagation()}
      >
        {!onRenderMarkdown && entry.text}
      </div>
      {overflows && (
        <button
          type="button"
          className={styles.expand_button}
          aria-expanded={expanded}
          onClick={e => { e.stopPropagation(); setExpanded(v => !v) }}
          onKeyDown={e => e.stopPropagation()}
        >
          {expanded ? 'Свернуть' : 'Развернуть'}
          <ChevronDown size={12} aria-hidden className={expanded ? styles.expand_icon_open : undefined} />
        </button>
      )}
    </>
  )
}

function DayRow({ entry, onOpenByDate, onContextMenu, onRenderMarkdown }: DayRowProps) {
  const [y, m, d] = entry.date.split('-').map(Number)
  const label     = `${d} ${MONTHS_GEN[m - 1]}`
  const dow       = DOW[new Date(y, m - 1, d).getDay()]
  const clickable = !!onOpenByDate

  function handleClick() { onOpenByDate?.(entry.date) }
  function handleKey(e: React.KeyboardEvent) {
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onOpenByDate?.(entry.date) }
  }
  function handleCtxMenu(e: MouseEvent<HTMLDivElement>) {
    e.preventDefault()
    onContextMenu?.(e, entry.date, entry.filePath, entry.reported)
  }

  const rowClass = `${styles.day_row}${clickable ? ` ${styles.day_row_clickable}` : ''}`

  if (entry.reported) {
    return (
      <div
        className={rowClass}
        role={clickable ? 'button' : 'listitem'}
        tabIndex={clickable ? 0 : undefined}
        onClick={clickable ? handleClick : undefined}
        onKeyDown={clickable ? handleKey : undefined}
        onContextMenu={handleCtxMenu}
        aria-label={clickable ? `Открыть заметку за ${label}` : undefined}
      >
        <div className={styles.day_reported}>
          <div className={styles.day_meta}>
            <span className={`${styles.day_dot} ${styles.dot_green}`} />
            <span className={styles.day_date}>{label}</span>
            <span className={styles.day_dow}>{dow}</span>
          </div>
          {entry.text && (
            <div className={styles.day_content}>
              <MarkdownBody entry={entry} onRenderMarkdown={onRenderMarkdown} />
            </div>
          )}
        </div>
      </div>
    )
  }

  return (
    <div
      className={rowClass}
      role={clickable ? 'button' : 'listitem'}
      tabIndex={clickable ? 0 : undefined}
      onClick={clickable ? handleClick : undefined}
      onKeyDown={clickable ? handleKey : undefined}
      onContextMenu={handleCtxMenu}
      aria-label={clickable ? `Создать заметку за ${label}` : undefined}
    >
      <div className={styles.day_reported}>
        <div className={styles.day_meta}>
          <span className={`${styles.day_dot} ${styles.dot_red}`} />
          <span className={styles.day_missed_name}>{label}</span>
          <span className={styles.day_dow}>{dow}</span>
          <span className={styles.day_missed_label}>пропущено</span>
        </div>
      </div>
    </div>
  )
}

interface Props {
  sourceDays:      HistoryDay[]
  onOpenByDate?:   (date: string) => void
  onOpenReport?:   (date: string, filePath: string) => void
  onDeleteReport?: (date: string, filePath: string) => void
  onRenderMarkdown?: RenderMarkdown
}

export default function TimelineBlock({ sourceDays, onOpenByDate, onOpenReport, onDeleteReport, onRenderMarkdown }: Props) {
  const [preset, setPreset]           = useState<Preset>('month')
  const [newestFirst, setNewestFirst] = useState(true)
  const [ctxMenu, setCtxMenu]         = useState<CtxState | null>(null)
  const menuRef                       = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!ctxMenu) return
    const close = (e: Event) => {
      if (menuRef.current?.contains(e.target as Node)) return
      setCtxMenu(null)
    }
    const t = setTimeout(() => document.addEventListener('mousedown', close), 0)
    return () => { clearTimeout(t); document.removeEventListener('mousedown', close) }
  }, [ctxMenu])
  const now = new Date()
  const [viewYear, setViewYear]   = useState(now.getFullYear())
  const [viewMonth, setViewMonth] = useState(now.getMonth())

  const today  = toISO(now)
  const dayMap = useMemo(() => new Map(sourceDays.map(d => [d.date, d])), [sourceDays])

  const allDays = useMemo<HistoryDay[]>(() => {
    let from: string, to: string

    if (preset === 'week') {
      from = daysAgo(6); to = today
    } else if (preset === 'month') {
      const y = viewYear, m = viewMonth
      from = `${y}-${String(m + 1).padStart(2, '0')}-01`
      const lastDay = new Date(y, m + 1, 0).getDate()
      to = `${y}-${String(m + 1).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`
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
      result.push({ date: iso, reported: !!r?.reported, text: r?.text ?? '', filePath: r?.filePath })
      cur.setDate(cur.getDate() + 1)
    }
    return result.filter(d => d.reported || d.date < today)
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

  function handleCtxMenu(e: MouseEvent<HTMLDivElement>, date: string, filePath: string | undefined, reported: boolean) {
    setCtxMenu({ x: e.clientX, y: e.clientY, date, filePath, reported })
  }

  function shiftMonth(delta: number) {
    const d = new Date(viewYear, viewMonth + delta, 1)
    setViewYear(d.getFullYear()); setViewMonth(d.getMonth())
  }

  const monthLabel     = `${MONTHS_NOM[viewMonth]} ${viewYear}`
  const isCurrentMonth = viewYear === now.getFullYear() && viewMonth === now.getMonth()

  return (
    <>
    <Card withBorder p={0} radius="md">
      <div className={styles.header}>
        <CalendarDays size={14} aria-hidden style={{ color: 'var(--mantine-color-dark-2)' }} />
        <span className={styles.header_title}>История</span>
      </div>

      <div className={styles.content}>
        <div className={styles.toolbar}>
          <SegmentedControl
            data={PRESET_DATA}
            value={preset}
            onChange={v => setPreset(v as Preset)}
            size="xs"
          />

          {preset === 'month' && (
            <div className={styles.month_nav}>
              <ActionIcon variant="subtle" size="sm" onClick={() => shiftMonth(-1)} aria-label="Предыдущий месяц">
                <ChevronLeft size={13} aria-hidden />
              </ActionIcon>
              <span className={styles.month_label}>{monthLabel}</span>
              <ActionIcon
                variant="subtle"
                size="sm"
                onClick={() => shiftMonth(1)}
                disabled={isCurrentMonth}
                aria-label="Следующий месяц"
              >
                <ChevronRight size={13} aria-hidden />
              </ActionIcon>
            </div>
          )}
        </div>

        <div className={styles.stats_grid}>
          <div className={styles.stat_card}>
            <CheckCircle size={16} aria-hidden style={{ color: 'var(--mantine-color-green-5)', flexShrink: 0 }} />
            <div className={styles.stat_card_text}>
              <div className={styles.stat_value}>{reported.length} написал</div>
              <div className={styles.stat_sub}>
                {preset === 'week'
                  ? `${fmtShort(daysAgo(6))} — ${fmtShort(today)}`
                  : preset === 'month'
                  ? monthLabel
                  : 'за всё время'}
              </div>
            </div>
          </div>
          <div className={styles.stat_card}>
            <XCircle size={16} aria-hidden style={{ color: 'var(--mantine-color-red-5)', flexShrink: 0 }} />
            <div className={styles.stat_card_text}>
              <div className={styles.stat_value}>{missed.length} пропустил</div>
              <div className={styles.stat_sub}>из {allDays.length} дней</div>
            </div>
          </div>
        </div>

        <div className={styles.sort_row}>
          <span>{pct}% сдачи</span>
          <UnstyledButton
            onClick={() => setNewestFirst(v => !v)}
            aria-label="Изменить порядок"
            style={{
              display: 'flex', alignItems: 'center', gap: 4,
              fontSize: 'var(--mantine-font-size-xs)',
              color: 'var(--mantine-color-dark-2)',
            }}
          >
            <ArrowUpDown size={12} aria-hidden />
            {newestFirst ? 'Новые сначала' : 'Старые сначала'}
          </UnstyledButton>
        </div>

        <div className={styles.list} role="list">
          {preset === 'all' ? (
            (newestFirst ? monthGroups : [...monthGroups].reverse()).map(group => {
              const groupDays = newestFirst ? [...group.days].reverse() : group.days
              return (
                <div key={group.key} className={styles.month_group}>
                  <div className={styles.month_heading_wrap}>
                    <div className={styles.month_heading}>
                      {MONTHS_NOM[group.month]} {group.year}
                      <span className={styles.month_count}>
                        {group.days.filter(d => d.reported).length}/{group.days.length}
                      </span>
                    </div>
                  </div>
                  {groupDays.map(entry => (
                    <DayRow key={entry.date} entry={entry} onOpenByDate={onOpenByDate} onContextMenu={handleCtxMenu} onRenderMarkdown={onRenderMarkdown} />
                  ))}
                </div>
              )
            })
          ) : (
            displayed.map(entry => (
              <DayRow key={entry.date} entry={entry} onOpenByDate={onOpenByDate} onContextMenu={handleCtxMenu} onRenderMarkdown={onRenderMarkdown} />
            ))
          )}
        </div>
      </div>
    </Card>

      {ctxMenu && createPortal(
        <div
          ref={menuRef}
          className={styles.ctx_menu}
          style={{ top: ctxMenu.y, left: Math.min(ctxMenu.x, window.innerWidth - 176) }}
        >
          {ctxMenu.reported && ctxMenu.filePath ? (
            <>
              <button className={styles.ctx_item} onClick={() => { onOpenReport?.(ctxMenu.date, ctxMenu.filePath!); setCtxMenu(null) }}>
                Открыть заметку
              </button>
              <button className={`${styles.ctx_item} ${styles.ctx_item_danger}`} onClick={() => { onDeleteReport?.(ctxMenu.date, ctxMenu.filePath!); setCtxMenu(null) }}>
                Удалить заметку
              </button>
            </>
          ) : (
            <button className={styles.ctx_item} onClick={() => { onOpenByDate?.(ctxMenu.date); setCtxMenu(null) }}>
              Создать отчёт
            </button>
          )}
        </div>,
        document.body
      )}
    </>
  )
}
