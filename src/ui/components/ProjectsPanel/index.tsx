import { useState, useMemo } from 'react'
import { Layers, Clock, ChevronDown } from 'lucide-react'
import CalendarHeatmap from '../CalendarHeatmap'
import StatsCards from '../StatsCards'
import ProgressBar from '../ProgressBar'
import DatePickerPopover from '../DatePickerPopover'
import AddProjectForm from '../AddProjectForm'
import { daysLeftUntil, deadlineProgress } from '../../../stats'
import type { Project, RangeMode } from '../../../types'
import styles from './styles.module.css'

const MONTHS_GEN = ['января','февраля','марта','апреля','мая','июня','июля','августа','сентября','октября','ноября','декабря']
function fmtShort(iso: string) { const [,m,d] = iso.split('-').map(Number); return `${d} ${MONTHS_GEN[m-1]}` }
function todayStr() { return new Date().toISOString().slice(0, 10) }

interface Props {
  projects:         Project[]
  editMode:         boolean
  activeId:         string
  rangeMode:        RangeMode
  sprintStart:      string
  sprintEnd:        string
  folders:          string[]
  onSelect:         (id: string) => void
  onSinceChange:    (id: string, since: string) => void
  onDeadlineChange: (id: string, deadline: string) => void
  onAdd:            (name: string, folder: string, deadline?: string) => void
  onCreateReport:   (date: string) => void
}

export default function ProjectsPanel({
  projects, editMode, activeId, rangeMode, sprintStart, sprintEnd, folders,
  onSelect, onSinceChange, onDeadlineChange, onAdd, onCreateReport,
}: Props) {
  const today   = todayStr()
  const [dropOpen, setDropOpen] = useState(false)
  const project = useMemo(
    () => projects.find(p => p.id === activeId) ?? projects[0],
    [projects, activeId],
  )

  if (projects.length === 0) {
    return (
      <div className={styles.empty}>
        <Layers size={28} aria-hidden className="icon_dim" />
        <p>Нет проектов — добавьте первый</p>
        <AddProjectForm onAdd={onAdd} folders={folders} />
      </div>
    )
  }

  const deadlineDays = project?.deadline ? daysLeftUntil(project.deadline, today) : null
  const deadlinePct  = (project?.deadline && project.since)
    ? deadlineProgress(project.since, project.deadline, today) : null
  const deadlineTone = deadlinePct != null && deadlinePct > 80 ? 'red' : deadlinePct != null && deadlinePct > 60 ? 'amber' : 'accent'

  return (
    <div>
      <div className={styles.header}>
        <div className={styles.proj_wrap}>
          <button
            className={styles.proj_btn}
            onClick={() => setDropOpen(v => !v)}
            aria-expanded={dropOpen}
            aria-haspopup="listbox"
          >
            <span>{project?.name ?? 'Проект'}</span>
            <ChevronDown size={12} className={dropOpen ? styles.chevron_open : styles.chevron} />
          </button>
          {dropOpen && projects.length > 0 && (
            <div className={styles.proj_list} role="listbox">
              {projects.map(p => (
                <button
                  key={p.id}
                  role="option"
                  aria-selected={p.id === activeId}
                  className={`${styles.proj_opt}${p.id === activeId ? ` ${styles.proj_opt_active}` : ''}`}
                  onMouseDown={() => { onSelect(p.id); setDropOpen(false) }}
                >
                  {p.name}
                </button>
              ))}
            </div>
          )}
        </div>
        <AddProjectForm onAdd={onAdd} folders={folders} />
      </div>

      {project?.deadline && (
        <div className={styles.deadline_row}>
          <Clock size={11} aria-hidden className="icon_muted" />
          <span className={styles.deadline_label}>Дедлайн {fmtShort(project.deadline)}</span>
          {deadlineDays != null && (
            <span className={styles.deadline_left}>
              {deadlineDays === 0 ? 'сегодня!' : `осталось ${deadlineDays} дн.`}
            </span>
          )}
          {deadlinePct != null && (
            <div className={styles.deadline_bar}>
              <ProgressBar pct={deadlinePct} tone={deadlineTone} compact />
            </div>
          )}
        </div>
      )}

      {project && (
        <div className={styles.body}>
          <CalendarHeatmap
            days={project.days}
            since={project.since}
            onCreateReport={onCreateReport}
          />
          <div className={styles.right}>
            <StatsCards
              days={project.days}
              weekendsOff={false}
              rangeMode={rangeMode}
              sprintStart={sprintStart}
              sprintEnd={sprintEnd}
              today={today}
            />
            {editMode && project && (
              <div className={styles.edit_row}>
                <DatePickerPopover
                  value={project.since}
                  onChange={v => onSinceChange(project.id, v)}
                  label="Отслеживать с:"
                />
                <DatePickerPopover
                  value={project.deadline ?? ''}
                  onChange={v => onDeadlineChange(project.id, v)}
                  label="Дедлайн:"
                  placeholder="Без дедлайна"
                  allowFuture
                />
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
