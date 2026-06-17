import styles from './styles.module.css'
import type React from 'react'

interface Props {
  pct:      number           // 0–100
  tone?:    'accent' | 'amber' | 'red'
  compact?: boolean
}

export default function ProgressBar({ pct, tone = 'accent', compact = false }: Props) {
  return (
    <div
      className={`${styles.bar}${compact ? ` ${styles.bar_compact}` : ''}`}
      role="progressbar"
      aria-valuenow={pct}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <div
        className={`${styles.fill} ${styles[`tone_${tone}`]}`}
        style={{ '--db-pct': `${pct}%` } as React.CSSProperties}
      />
    </div>
  )
}
