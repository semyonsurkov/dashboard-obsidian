import { useState } from 'react'
import { PenLine, CheckCircle, Zap, ChevronLeft, ChevronRight, ChevronDown, Plus, AlertCircle } from 'lucide-react'
import { Button } from '@/ui/components/ui/button'
import ProgressBar from '../ProgressBar'
import type { Tracker, Sprint } from '../../../types'
import type { SprintInfo } from '../../../stats'
import styles from './styles.module.css'

const MONTHS_GEN = ['января','февраля','марта','апреля','мая','июня','июля','августа','сентября','октября','ноября','декабря']
function fmtShort(iso: string) { const [,m,d] = iso.split('-').map(Number); return `${d} ${MONTHS_GEN[m-1]}` }
function pluralDays(n: number) {
  if (n % 10 === 1 && n % 100 !== 11) return 'день'
  if ([2,3,4].includes(n % 10) && ![12,13,14].includes(n % 100)) return 'дня'
  return 'дней'
}

type FullSprint = SprintInfo & {
  goalsPersonal: string[]
  goalsWork:     string[]
  summary?:      string
  retro?:        string
  created:       boolean
}

interface Props {
  sprint:         FullSprint
  sprints:        Sprint[]
  trackers:       Tracker[]
  onWrite:        (trackerLabel: string) => void
  onPrev:         () => void
  onNext:         () => void
  onSelectSprint: (weekNumber: number, year: number) => void
  onCreateSprint: () => void
  onOpenNote:     (section: 'goals' | 'summary' | 'retro') => void
}

function sprintItemState(s: Sprint, today: string): 'past' | 'active' | 'future' {
  if (s.end < today) return 'past'
  if (s.start > today) return 'future'
  return 'active'
}

export default function SprintHero({
  sprint, sprints, trackers,
  onWrite, onPrev, onNext, onSelectSprint, onCreateSprint, onOpenNote,
}: Props) {
  const [listOpen, setListOpen] = useState(false)
  const today     = new Date().toISOString().slice(0, 10)
  const isWeekend = [0, 6].includes(new Date().getDay())

  const statuses = trackers.map(t => ({
    ...t,
    doneToday: !!t.days.find(d => d.date === today)?.reported,
    skip: t.weekendsOff && isWeekend,
  }))
  const pending = statuses.filter(s => !s.doneToday && !s.skip)
  const allDone  = pending.length === 0

  const isActive   = sprint.state === 'active'
  const isPast     = sprint.state === 'past'
  const isFuture   = sprint.state === 'future'
  const hasSummary = !!(sprint.summary || sprint.retro)
  const showGoals  = (isActive || (isFuture && sprint.created) || (isPast && hasSummary))
    && (sprint.goalsPersonal.length > 0 || sprint.goalsWork.length > 0)

  return (
    <div className={`db_card ${styles.hero}`}>
      {/* ── Header ── */}
      <div className={styles.top}>
        <div className={styles.nav}>
          <button className={styles.icon_btn} onClick={onPrev} aria-label="Предыдущий спринт">
            <ChevronLeft size={14} />
          </button>

          <div className={styles.meta}>
            <Zap size={14} aria-hidden className="icon_purple" />
            <button
              className={styles.name_btn}
              onClick={() => setListOpen(v => !v)}
              aria-expanded={listOpen}
              aria-label="Список спринтов"
            >
              <span className={styles.name}>Спринт W{sprint.weekNumber}</span>
              <ChevronDown size={11} className={listOpen ? styles.chevron_open : styles.chevron} />
            </button>
            <span className={styles.sep}>·</span>
            <span className={styles.range}>{fmtShort(sprint.start)} — {fmtShort(sprint.end)}</span>
            {isActive && (
              <>
                <span className={styles.sep}>·</span>
                <span className={styles.countdown}>
                  {sprint.daysLeft === 0
                    ? 'последний день'
                    : `осталось ${sprint.daysLeft} ${pluralDays(sprint.daysLeft)}`}
                </span>
              </>
            )}
          </div>

          <button className={styles.icon_btn} onClick={onNext} aria-label="Следующий спринт">
            <ChevronRight size={14} />
          </button>
        </div>

        {isActive && (
          <div className={styles.actions}>
            {allDone ? (
              <div className={styles.done}>
                <CheckCircle size={13} aria-hidden className="icon_green" />
                <span>Все отчёты сданы</span>
              </div>
            ) : (
              pending.map(t => (
                <Button key={t.id} variant="amber" size="sm" onClick={() => onWrite(t.id)}>
                  <PenLine size={12} aria-hidden /> {t.label.split(' ')[0]}
                </Button>
              ))
            )}
          </div>
        )}
      </div>

      {/* ── Sprint list dropdown ── */}
      {listOpen && (
        <div className={styles.list}>
          {[...sprints].reverse().map(s => {
            const isViewing     = s.weekNumber === sprint.weekNumber && s.year === sprint.year
            const isCurrentWeek = s.start <= today && today <= s.end
            const itemState     = sprintItemState(s, today)
            const hasSumm       = !!(s.summary || s.retro)
            const badge         = itemState === 'past' && hasSumm ? '✓' : itemState === 'past' ? '⚠' : ''
            return (
              <button
                key={`${s.year}-${s.weekNumber}`}
                className={`${styles.list_item}${isViewing ? ` ${styles.list_current}` : ''}`}
                onClick={() => { onSelectSprint(s.weekNumber, s.year); setListOpen(false) }}
              >
                <span className={styles.list_name}>W{s.weekNumber}</span>
                <span className={styles.list_range}>{fmtShort(s.start)} — {fmtShort(s.end)}</span>
                {isCurrentWeek && <span className={styles.list_tag}>текущий</span>}
                {badge && <span className={styles.list_badge}>{badge}</span>}
              </button>
            )
          })}
        </div>
      )}

      {/* ── Progress bar (active + past) ── */}
      {!isFuture && (
        <div className={styles.bar_row}>
          <ProgressBar pct={sprint.progress} />
          <span className={styles.pct}>{sprint.progress}%</span>
        </div>
      )}

      {/* ── FUTURE: create sprint ── */}
      {isFuture && !sprint.created && (
        <div className={styles.future_body}>
          <p className={styles.future_hint}>Спринт ещё не создан — добавьте цели</p>
          <Button onClick={onCreateSprint}>
            <Plus size={14} aria-hidden /> Создать спринт
          </Button>
        </div>
      )}

      {/* ── PAST: summary/retro or warning ── */}
      {isPast && (
        hasSummary ? (
          <div className={styles.summary_body}>
            {sprint.summary && (
              <div className={styles.summary_block}>
                <span className={styles.summary_label}>Итог</span>
                <p className={styles.summary_text}>{sprint.summary}</p>
              </div>
            )}
            {sprint.retro && (
              <div className={styles.summary_block}>
                <span className={styles.summary_label}>Ретро</span>
                <p className={styles.summary_text}>{sprint.retro}</p>
              </div>
            )}
            <Button variant="ghost" size="sm" onClick={() => onOpenNote('summary')}>
              Открыть заметку
            </Button>
          </div>
        ) : (
          <div className={styles.retro_warn}>
            <AlertCircle size={13} className="icon_amber" aria-hidden />
            <span>Нужно написать итог и ретро</span>
            <Button variant="amber" size="sm" onClick={() => onOpenNote('summary')}>
              Открыть заметку
            </Button>
          </div>
        )
      )}

      {/* ── Goals (active / future created / past with summary) ── */}
      {showGoals && (
        <div className={styles.goals}>
          <button className={styles.goals_hdr_btn} onClick={() => onOpenNote('goals')}>
            <span className={styles.goals_label}>Цели</span>
          </button>
          <div className={styles.goals_cols}>
            {sprint.goalsPersonal.length > 0 && (
              <div className={styles.goal_col}>
                <span className={styles.goal_section}>Личное</span>
                <div className={styles.goal_chips}>
                  {sprint.goalsPersonal.map(g => <span key={g} className={styles.chip}>{g}</span>)}
                </div>
              </div>
            )}
            {sprint.goalsWork.length > 0 && (
              <div className={styles.goal_col}>
                <span className={styles.goal_section}>Работа</span>
                <div className={styles.goal_chips}>
                  {sprint.goalsWork.map(g => <span key={g} className={styles.chip}>{g}</span>)}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
