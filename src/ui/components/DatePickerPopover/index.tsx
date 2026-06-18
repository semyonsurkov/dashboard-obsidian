import { DatePickerInput } from '@mantine/dates'
import styles from './styles.module.css'

const MONTHS_GEN = ['января','февраля','марта','апреля','мая','июня','июля','августа','сентября','октября','ноября','декабря']

function parseISO(iso: string): Date | null {
  if (!iso) return null
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(y, m - 1, d)
}

function toISO(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${dd}`
}

function fmtShort(iso: string): string {
  const [, m, d] = iso.split('-').map(Number)
  return `${d} ${MONTHS_GEN[m - 1]}`
}

interface Props {
  value:        string
  onChange:     (v: string) => void
  label?:       string
  placeholder?: string
  allowFuture?: boolean
}

export default function DatePickerPopover({
  value, onChange, label, placeholder = 'Выбрать', allowFuture = false,
}: Props) {
  const selected = parseISO(value)
  const maxDate  = allowFuture ? undefined : new Date()

  return (
    <div className={styles.root}>
      {label && <span className={styles.label}>{label}</span>}
      <DatePickerInput
        value={selected}
        onChange={d => { if (d) onChange(toISO(d)) }}
        maxDate={maxDate}
        placeholder={placeholder}
        valueFormat="D MMM"
        className={styles.picker}
        size="sm"
        popoverProps={{ position: 'bottom-start' }}
        clearable={false}
        renderDay={date => (
          <span>{date.getDate()}</span>
        )}
        getDayProps={date => ({
          'aria-label': `${date.getDate()} ${MONTHS_GEN[date.getMonth()]} ${date.getFullYear()}`,
        })}
      />
    </div>
  )
}
