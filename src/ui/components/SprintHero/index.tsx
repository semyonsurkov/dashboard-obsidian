import { useState } from 'react'
import { PenLine, CheckCircle, Zap, ChevronLeft, ChevronRight, ChevronDown, AlertCircle, ListChecks, FolderOpen, FileText } from 'lucide-react'
import { Card, Button, Badge, ActionIcon, Popover } from '@mantine/core'
import ProgressBar from '../ProgressBar'
import type { Tracker, Sprint } from '../../../types'
import type { SprintInfo } from '../../../stats'
import styles from './styles.module.css'

const MONTHS_GEN = ['января','февраля','марта','апреля','мая','июня','июля','августа','сентября','октября','ноября','декабря']

function fmtShort(iso: string) { const [, m, d] = iso.split('-').map(Number); return `${d} ${MONTHS_GEN[m-1]}` }

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
  const [popOpen, setPopOpen] = useState(false)

  const now       = new Date()
  const today     = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}`
  const isWeekend = [0, 6].includes(now.getDay())

  const statuses = trackers.map(t => ({
    ...t,
    doneToday: !!t.days.find(d => d.date === today)?.reported,
    skip: t.weekendsOff && isWeekend,
  }))
  const pending = statuses.filter(s => !s.doneToday && !s.skip)
  const allDone = pending.length === 0

  const isActive   = sprint.state === 'active'
  const isPast     = sprint.state === 'past'
  const isFuture   = sprint.state === 'future'
  const hasSummary = !!(sprint.summary || sprint.retro)
  const showGoals  = (isActive || (isFuture && sprint.created) || (isPast && hasSummary))
    && (sprint.goalsPersonal.length > 0 || sprint.goalsWork.length > 0)

  return (
    <Card withBorder p={0} radius="md">
      <div className={styles.header}>
        <div className={styles.header_row}>
          {/* Left: navigation + sprint title */}
          <div className={styles.sprint_nav}>
            <ActionIcon variant="default" size="sm" onClick={onPrev} aria-label="Предыдущий спринт">
              <ChevronLeft size={14} />
            </ActionIcon>

            <div className={styles.sprint_info}>
              <div className={styles.sprint_title_row}>
                <Zap size={14} aria-hidden style={{ color: 'var(--mantine-color-blue-5)', flexShrink: 0 }} />

                <Popover
                  opened={popOpen}
                  onChange={setPopOpen}
                  position="bottom-start"
                  width={224}
                  shadow="md"
                >
                  <Popover.Target>
                    <Button
                      variant="subtle"
                      size="xs"
                      rightSection={<ChevronDown size={11} />}
                      onClick={() => setPopOpen(v => !v)}
                      aria-label="Список спринтов"
                    >
                      Спринт W{sprint.weekNumber}
                    </Button>
                  </Popover.Target>
                  <Popover.Dropdown p={4}>
                    <div className={styles.sprint_list}>
                      {[...sprints].reverse().map(s => {
                        const isViewing     = s.weekNumber === sprint.weekNumber && s.year === sprint.year
                        const isCurrentWeek = s.start <= today && today <= s.end
                        const itemState     = sprintItemState(s, today)
                        const hasSumm       = !!(s.summary || s.retro)
                        const badge         = itemState === 'past' ? (hasSumm ? '✓' : '!') : ''
                        return (
                          <button
                            key={`${s.year}-${s.weekNumber}`}
                            className={`${styles.sprint_item}${isViewing ? ` ${styles.sprint_item_active}` : ''}`}
                            onClick={() => { onSelectSprint(s.weekNumber, s.year); setPopOpen(false) }}
                          >
                            <span className={styles.sprint_item_num}>W{s.weekNumber}</span>
                            <span className={styles.sprint_item_dates}>
                              {fmtShort(s.start)} - {fmtShort(s.end)}
                            </span>
                            {isCurrentWeek && (
                              <Badge variant="light" size="xs" color="blue">текущий</Badge>
                            )}
                            {badge && <span style={{ fontSize: 'var(--mantine-font-size-xs)', color: 'var(--mantine-color-dark-3)' }}>{badge}</span>}
                          </button>
                        )
                      })}
                    </div>
                  </Popover.Dropdown>
                </Popover>

                {sprint.created && (
                  <ActionIcon
                    variant="subtle"
                    size="sm"
                    onClick={() => onOpenNote('goals')}
                    aria-label="Открыть заметку спринта"
                  >
                    <FileText size={14} aria-hidden />
                  </ActionIcon>
                )}
              </div>

              <div className={styles.sprint_dates_row}>
                <span className={styles.sprint_dates}>{fmtShort(sprint.start)} — {fmtShort(sprint.end)}</span>
                {isActive && (
                  <span className={styles.days_left}>
                    {sprint.daysLeft === 0
                      ? 'последний день'
                      : `${sprint.daysLeft} ${pluralDays(sprint.daysLeft)}`}
                  </span>
                )}
              </div>
            </div>

            <ActionIcon variant="default" size="sm" onClick={onNext} aria-label="Следующий спринт">
              <ChevronRight size={14} />
            </ActionIcon>
          </div>

          {/* Right: write buttons */}
          {isActive && (
            <div className={styles.actions}>
              {statuses.filter(s => !s.skip).length === 0 ? (
                <span className={styles.all_done}>
                  <CheckCircle size={13} aria-hidden style={{ color: 'var(--mantine-color-green-5)' }} />
                  Выходной
                </span>
              ) : (
                statuses.filter(s => !s.skip).map(t => (
                  t.doneToday ? (
                    <Button
                      key={t.id}
                      variant="subtle"
                      size="xs"
                      leftSection={<FolderOpen size={12} aria-hidden />}
                      onClick={() => onWrite(t.id)}
                      style={{ flexShrink: 0 }}
                    >
                      Открыть {t.label.split(' ')[0].toLowerCase()}
                    </Button>
                  ) : (
                    <Button
                      key={t.id}
                      color={t.id === 'work' ? 'green' : 'orange'}
                      size="xs"
                      leftSection={<PenLine size={12} aria-hidden />}
                      onClick={() => onWrite(t.id)}
                      style={{ flexShrink: 0 }}
                    >
                      Сдать {t.label.split(' ')[0].toLowerCase()}
                    </Button>
                  )
                ))
              )}
            </div>
          )}
        </div>
      </div>

      <div className={styles.content}>
        {!isFuture && (
          <div className={styles.progress_row}>
            <div className={styles.progress_label_row}>
              <span className={styles.progress_label}>Прогресс спринта</span>
              <span className={styles.progress_pct}>{sprint.progress}%</span>
            </div>
            <ProgressBar pct={sprint.progress} />
          </div>
        )}

        {isActive && !sprint.created && (
          <div className={styles.banner}>
            <p className={styles.banner_text}>Спринт не создан — добавьте цели</p>
            <Button size="xs" onClick={onCreateSprint}>Создать спринт</Button>
          </div>
        )}

        {isFuture && !sprint.created && (
          <div className={styles.banner}>
            <p className={styles.banner_text}>Спринт ещё не создан — добавьте цели</p>
            <Button size="xs" onClick={onCreateSprint}>Создать спринт</Button>
          </div>
        )}

        {isPast && (
          hasSummary ? (
            <div className={styles.summary_panel}>
              {sprint.summary && (
                <div className={styles.summary_section}>
                  <span className={styles.summary_label}>Итог</span>
                  <p className={styles.summary_text}>{sprint.summary}</p>
                </div>
              )}
              {sprint.retro && (
                <div className={styles.summary_section}>
                  <span className={styles.summary_label}>Ретро</span>
                  <p className={styles.summary_text}>{sprint.retro}</p>
                </div>
              )}
              <Button variant="subtle" size="xs" onClick={() => onOpenNote('summary')}>
                Открыть заметку
              </Button>
            </div>
          ) : (
            <div className={styles.banner}>
              <AlertCircle size={13} style={{ color: 'var(--mantine-color-orange-5)', flexShrink: 0 }} aria-hidden />
              <p className={styles.banner_text} style={{ flex: 1 }}>Нужно написать итог и ретро</p>
              <Button color="orange" size="xs" onClick={() => onOpenNote('summary')}>
                Открыть заметку
              </Button>
            </div>
          )
        )}

        {showGoals && (
          <div className={styles.goals_section}>
            <button className={styles.goals_heading} onClick={() => onOpenNote('goals')}>
              <ListChecks size={14} aria-hidden style={{ color: 'var(--mantine-color-dark-2)' }} />
              <span className={styles.goals_heading_text}>Цели спринта</span>
            </button>
            <div className={styles.goals_grid}>
              {sprint.goalsPersonal.length > 0 && (
                <div className={styles.goals_col}>
                  <span className={styles.goals_col_label}>Личное</span>
                  <div className={styles.goals_list}>
                    {sprint.goalsPersonal.map((g, i) => (
                      <button key={i} className={styles.goal_item} onClick={() => onOpenNote('goals')}>
                        {g}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              {sprint.goalsWork.length > 0 && (
                <div className={styles.goals_col}>
                  <span className={styles.goals_col_label}>Работа</span>
                  <div className={styles.goals_list}>
                    {sprint.goalsWork.map((g, i) => (
                      <button key={i} className={styles.goal_item} onClick={() => onOpenNote('goals')}>
                        {g}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </Card>
  )
}
