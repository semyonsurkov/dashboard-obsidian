import { useState } from 'react'
import { CalendarDays } from 'lucide-react'
import { Popover, PopoverContent, PopoverTrigger } from '@/ui/components/ui/popover'
import { Calendar } from '@/ui/components/ui/calendar'
import { Button } from '@/ui/components/ui/button'

const MONTHS_GEN = ['января','февраля','марта','апреля','мая','июня','июля','августа','сентября','октября','ноября','декабря']
function parseISO(iso: string) { const [y, m, d] = iso.split('-').map(Number); return new Date(y, m - 1, d) }
function toISO(d: Date) {
  const y = d.getFullYear(), m = String(d.getMonth() + 1).padStart(2, '0'), dd = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${dd}`
}
function fmtShort(iso: string) { const [, m, d] = iso.split('-').map(Number); return `${d} ${MONTHS_GEN[m - 1]}` }

interface Props {
  value:        string
  onChange:     (v: string) => void
  label?:       string
  placeholder?: string
  allowFuture?: boolean
}

export default function DatePickerPopover({ value, onChange, label, placeholder = 'Выбрать', allowFuture = false }: Props) {
  const [open, setOpen] = useState(false)
  const selected     = value ? parseISO(value) : undefined
  const disabled     = allowFuture ? undefined : { after: new Date() }
  const defaultMonth = value ? parseISO(value) : new Date()

  return (
    <div className="tw-flex tw-items-center tw-gap-2">
      {label && <span className="tw-text-xs tw-text-muted-foreground">{label}</span>}
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button variant="ghost" size="sm">
            <CalendarDays size={11} aria-hidden />
            {value ? fmtShort(value) : placeholder}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="tw-w-auto tw-p-0" align="start">
          <Calendar
            mode="single"
            selected={selected}
            defaultMonth={defaultMonth}
            onSelect={(d: Date | undefined) => { if (d) { onChange(toISO(d)); setOpen(false) } }}
            disabled={disabled}
          />
        </PopoverContent>
      </Popover>
    </div>
  )
}
