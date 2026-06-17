import { useState, useRef, useEffect } from 'react'
import { DayPicker } from 'react-day-picker'
import { CalendarDays, ChevronLeft, ChevronRight } from 'lucide-react'
import styles from './styles.module.css'

const MONTHS_NOM = ['Январь','Февраль','Март','Апрель','Май','Июнь','Июль','Август','Сентябрь','Октябрь','Ноябрь','Декабрь']
const MONTHS_GEN = ['января','февраля','марта','апреля','мая','июня','июля','августа','сентября','октября','ноября','декабря']

function toISO(d: Date) { return d.toISOString().slice(0, 10) }
function parseISO(iso: string) { const [y,m,d] = iso.split('-').map(Number); return new Date(y, m-1, d) }
function fmtShort(iso: string) { const [,m,d] = iso.split('-').map(Number); return `${d} ${MONTHS_GEN[m-1]}` }

interface Props {
  value:        string          // ISO YYYY-MM-DD ('' = empty)
  onChange:     (v: string) => void
  label?:       string
  placeholder?: string
  allowFuture?: boolean
}

export default function DatePickerPopover({
  value, onChange, label, placeholder = 'Выбрать', allowFuture = false,
}: Props) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    function onDown(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [open])

  const selected     = value ? parseISO(value) : undefined
  const disabled     = allowFuture ? undefined : { after: new Date() }
  const defaultMonth = value ? parseISO(value) : new Date()

  return (
    <div className={styles.wrap} ref={ref}>
      {label && <span className={styles.label}>{label}</span>}
      <button
        className="btn btn--ghost btn--sm"
        onClick={() => setOpen(v => !v)}
        aria-expanded={open}
        aria-haspopup="dialog"
      >
        <CalendarDays size={11} aria-hidden />
        {value ? fmtShort(value) : placeholder}
      </button>

      {open && (
        <div className={styles.pop} role="dialog" aria-label="Выбрать дату">
          <DayPicker
            mode="single"
            selected={selected}
            defaultMonth={defaultMonth}
            onSelect={d => { if (d) { onChange(toISO(d)); setOpen(false) } }}
            disabled={disabled}
            formatters={{
              formatCaption: d => `${MONTHS_NOM[d.getMonth()]} ${d.getFullYear()}`,
              formatWeekdayName: d => ['Вс','Пн','Вт','Ср','Чт','Пт','Сб'][d.getDay()],
            }}
            components={{
              Chevron: ({ orientation }: { orientation?: string }) =>
                orientation === 'left'
                  ? <ChevronLeft size={14} aria-hidden />
                  : <ChevronRight size={14} aria-hidden />,
            }}
          />
        </div>
      )}
    </div>
  )
}
