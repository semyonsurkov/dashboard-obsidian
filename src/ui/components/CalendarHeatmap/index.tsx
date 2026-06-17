import { useState, useMemo } from 'react'
import { DayPicker, type DayMouseEventHandler } from 'react-day-picker'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { daysForMonth } from '../../../stats'
import type { HistoryDay } from '../../../types'
import styles from './styles.module.css'

const MONTHS_NOM = ['Январь','Февраль','Март','Апрель','Май','Июнь','Июль','Август','Сентябрь','Октябрь','Ноябрь','Декабрь']
const MONTHS_GEN = ['января','февраля','марта','апреля','мая','июня','июля','августа','сентября','октября','ноября','декабря']

function toISO(d: Date) {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}
function parseISO(iso: string) { const [y,m,d] = iso.split('-').map(Number); return new Date(y, m-1, d) }
function fmtShort(iso: string) { const [,m,d] = iso.split('-').map(Number); return `${d} ${MONTHS_GEN[m-1]}` }

interface Props {
  days:            HistoryDay[]
  since:           string
  onCreateReport?: (date: string) => void
}

export default function CalendarHeatmap({ days, since, onCreateReport }: Props) {
  const now  = new Date()
  const [year, setYear]   = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth())

  const today        = toISO(now)
  const atCurrent    = year === now.getFullYear() && month >= now.getMonth()
  const displayMonth = useMemo(() => new Date(year, month, 1), [year, month])

  const monthDays = useMemo(() => daysForMonth(days, year, month), [days, year, month])
  const reported  = useMemo(() => monthDays.filter(d => d.reported).map(d => parseISO(d.date)), [monthDays])
  const missed    = useMemo(() => monthDays.filter(d => !d.reported && d.date < today).map(d => parseISO(d.date)), [monthDays, today])

  function shift(delta: number) {
    const d = new Date(year, month + delta, 1)
    setYear(d.getFullYear()); setMonth(d.getMonth())
  }

  const handleDayClick: DayMouseEventHandler = (day, _modifiers) => {
    const iso = toISO(day)
    if (iso <= today && onCreateReport) {
      onCreateReport(iso)
    }
  }

  return (
    <div>
      <DayPicker
        mode="single"
        month={displayMonth}
        onMonthChange={d => d < displayMonth ? shift(-1) : shift(1)}
        disabled={{ after: now }}
        fixedWeeks
        showOutsideDays={false}
        onDayClick={handleDayClick}
        components={{
          Chevron: ({ orientation }: { orientation?: string }) =>
            orientation === 'left'
              ? <ChevronLeft size={14} aria-hidden />
              : <ChevronRight size={14} aria-hidden className={atCurrent ? 'rdp_chevron_dim' : ''} />,
        }}
        modifiers={{ reported, missed }}
        modifiersClassNames={{ reported: 'day_reported', missed: 'day_missed' }}
        formatters={{
          formatCaption: d => `${MONTHS_NOM[d.getMonth()]} ${d.getFullYear()}`,
          formatWeekdayName: d => ['Вс','Пн','Вт','Ср','Чт','Пт','Сб'][d.getDay()],
        }}
      />

      <div className={styles.footer}>
        <div className={styles.legend}>
          <span className={styles.leg_item}><span className="dot dot_green" /> Сдал</span>
          <span className={styles.leg_item}><span className="dot dot_red" /> Пропустил</span>
        </div>
        <span className={styles.since}>с {fmtShort(since)}</span>
      </div>
    </div>
  )
}
