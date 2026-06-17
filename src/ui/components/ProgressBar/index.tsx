import { Progress } from '@/ui/components/ui/progress'
import { cn } from '@/lib/utils'

interface Props {
  pct:      number
  tone?:    'accent' | 'amber' | 'red'
  compact?: boolean
}

const toneMap: Record<string, string> = {
  accent: 'tw-bg-[var(--accent)]',
  amber:  'tw-bg-amber-500',
  red:    'tw-bg-red-500',
}

export default function ProgressBar({ pct, tone = 'accent', compact = false }: Props) {
  return (
    <Progress
      value={pct}
      className={compact ? 'tw-h-1' : 'tw-h-2'}
      indicatorClassName={toneMap[tone]}
    />
  )
}
