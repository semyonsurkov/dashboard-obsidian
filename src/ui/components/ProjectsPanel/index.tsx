import { useEffect, useMemo } from 'react'
import { Layers, Clock } from 'lucide-react'
import { Select } from '@mantine/core'
import CalendarHeatmap from '../CalendarHeatmap'
import StatsCards from '../StatsCards'
import ProgressBar from '../ProgressBar'
import DatePickerPopover from '../DatePickerPopover'
import AddProjectForm from '../AddProjectForm'
import { daysLeftUntil, deadlineProgress } from '../../../stats'
import type { Project, RangeMode } from '../../../types'
import styles from './styles.module.css'

function todayStr() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
}

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
  onAdd:            (name: string, folder: string, deadline?: string) => Promise<void>
  onCreateReport:   (date: string) => void
}

export default function ProjectsPanel({
  projects, editMode, activeId, rangeMode, sprintStart, sprintEnd, folders,
  onSelect, onSinceChange, onDeadlineChange, onAdd, onCreateReport,
}: Props) {
  const today   = todayStr()
  const project = useMemo(
    () => projects.find(p => p.id === activeId) ?? projects[0],
    [projects, activeId],
  )

  useEffect(() => {
    if (projects.length > 0 && project && project.id !== activeId) {
      onSelect(project.id)
    }
  }, [project, activeId, projects.length, onSelect])

  if (projects.length === 0) {
    return (
      <div className={styles.empty_state}>
        <Layers size={28} aria-hidden style={{ color: 'var(--mantine-color-dark-3)' }} />
        <p className={styles.empty_text}>Нет проектов — добавьте первый</p>
        <AddProjectForm onAdd={onAdd} folders={folders} />
      </div>
    )
  }

  const deadlineDays = project?.deadline ? daysLeftUntil(project.deadline, today) : null
  const deadlinePct  = (project?.deadline && project.since)
    ? deadlineProgress(project.since, project.deadline, today) : null
  const deadlineTone = deadlinePct != null && deadlinePct > 80 ? 'red' : deadlinePct != null && deadlinePct > 60 ? 'amber' : 'accent'

  const selectData = projects.map(p => ({ value: p.id, label: p.name }))

  return (
    <div>
      <div className={styles.controls}>
        <div className={styles.select_wrap}>
          <Select
            value={activeId}
            onChange={v => { if (v) onSelect(v) }}
            data={selectData}
            size="sm"
          />
        </div>
        <AddProjectForm onAdd={onAdd} folders={folders} />
      </div>

      {project && (
        <>
          <div className={styles.grid}>
            <CalendarHeatmap
              days={project.days}
              since={project.since}
              onCreateReport={onCreateReport}
            />
            <StatsCards
              days={project.days}
              weekendsOff={false}
              rangeMode={rangeMode}
              sprintStart={sprintStart}
              sprintEnd={sprintEnd}
              today={today}
            />
          </div>

          <div className={styles.meta}>
            <span>Отслеживать с</span>
            <DatePickerPopover
              value={project.since}
              onChange={v => onSinceChange(project.id, v)}
            />
            <span className={styles.sep}>·</span>
            <span>Дедлайн</span>
            <DatePickerPopover
              value={project.deadline ?? ''}
              onChange={v => onDeadlineChange(project.id, v)}
              placeholder="Не задан"
              allowFuture
            />
            {project.deadline && deadlineDays != null && (
              <>
                <span className={styles.sep}>·</span>
                <Clock size={11} aria-hidden />
                <span className={styles.deadline_days}>
                  {deadlineDays === 0 ? 'сегодня!' : `осталось ${deadlineDays} дн.`}
                </span>
                {deadlinePct != null && (
                  <div className={styles.deadline_bar}>
                    <ProgressBar pct={deadlinePct} tone={deadlineTone} compact />
                  </div>
                )}
              </>
            )}
          </div>
        </>
      )}
    </div>
  )
}
