import { Progress } from '@mantine/core'
import styles from './styles.module.css'

interface Props {
  pct:      number
  tone?:    'accent' | 'amber' | 'red'
  compact?: boolean
}

const toneColor: Record<string, string> = {
  accent: 'blue',
  amber:  'amber',
  red:    'red',
}

export default function ProgressBar({ pct, tone = 'accent', compact = false }: Props) {
  const clamped = Math.min(100, Math.max(0, pct))
  return (
    <Progress
      value={clamped}
      color={toneColor[tone]}
      size={compact ? 4 : 8}
      radius="xl"
      className={compact ? styles.root_compact : styles.root_default}
    />
  )
}
