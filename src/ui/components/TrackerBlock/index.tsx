import { useState, useMemo, useEffect } from 'react'
import { NotebookPen, Briefcase, Layers } from 'lucide-react'
import CalendarHeatmap from '../CalendarHeatmap'
import StatsCards from '../StatsCards'
import DatePickerPopover from '../DatePickerPopover'
import ProjectsPanel from '../ProjectsPanel'
import { ToggleGroup, ToggleGroupItem } from '@/ui/components/ui/toggle-group'
import type { Tracker, Project, TrackerId, MainTab, RangeMode, HistoryDay } from '../../../types'
import type { SprintInfo } from '../../../stats'
import styles from './styles.module.css'

interface Props {
  trackers:           Tracker[]
  projects:           Project[]
  editMode:           boolean
  sprint:             SprintInfo
  folders:            string[]
  onSinceChange:      (id: TrackerId, since: string) => void
  onProjectUpdate:    (id: string, patch: Partial<Project>) => void
  onAddProject:       (name: string, folder: string, deadline?: string) => void
  onActiveDaysChange: (days: HistoryDay[]) => void
  onCreateReport:     (date: string, trackerId: string) => void
}

export default function TrackerBlock({
  trackers, projects, editMode, sprint, folders,
  onSinceChange, onProjectUpdate, onAddProject, onActiveDaysChange, onCreateReport,
}: Props) {
  const [activeTab, setActiveTab]             = useState<MainTab>(trackers[0].id)
  const [activeProjectId, setActiveProjectId] = useState(projects[0]?.id ?? '')
  const [rangeMode, setRangeMode]             = useState<RangeMode>('all')

  const isProjects    = activeTab === 'projects'
  const activeTracker = !isProjects ? (trackers.find(t => t.id === activeTab) ?? trackers[0]) : null

  const activeDays = useMemo(
    () => isProjects
      ? (projects.find(p => p.id === activeProjectId)?.days ?? [])
      : (activeTracker?.days ?? []),
    [isProjects, activeProjectId, projects, activeTracker],
  )

  useEffect(() => {
    onActiveDaysChange(activeDays)
  }, [activeDays]) // eslint-disable-line react-hooks/exhaustive-deps

  function switchTab(tab: MainTab) {
    setActiveTab(tab)
    const days = tab === 'projects'
      ? (projects.find(p => p.id === activeProjectId)?.days ?? [])
      : (trackers.find(t => t.id === tab)?.days ?? [])
    onActiveDaysChange(days)
  }

  function switchProject(id: string) {
    setActiveProjectId(id)
    onActiveDaysChange(projects.find(p => p.id === id)?.days ?? [])
  }

  const todayStr = new Date().toISOString().slice(0, 10)

  return (
    <div className="db_card">
      <div className={styles.tabs}>
        <ToggleGroup
          type="single"
          value={activeTab}
          onValueChange={v => { if (v) switchTab(v as MainTab) }}
          className="tw-justify-start"
        >
          <ToggleGroupItem value="personal" className="tw-gap-1.5">
            <NotebookPen size={13} aria-hidden /> Личный отчёт
          </ToggleGroupItem>
          <ToggleGroupItem value="work" className="tw-gap-1.5">
            <Briefcase size={13} aria-hidden /> Рабочий отчёт
          </ToggleGroupItem>
          <ToggleGroupItem value="projects" className="tw-gap-1.5">
            <Layers size={13} aria-hidden /> Проекты
          </ToggleGroupItem>
        </ToggleGroup>

        <ToggleGroup
          type="single"
          value={rangeMode}
          onValueChange={v => { if (v) setRangeMode(v as RangeMode) }}
          className={styles.range_toggle}
        >
          <ToggleGroupItem value="all" size="sm" className="tw-rounded-full">Всё время</ToggleGroupItem>
          <ToggleGroupItem value="sprint" size="sm" className="tw-rounded-full">Спринт</ToggleGroupItem>
        </ToggleGroup>
      </div>

      {isProjects ? (
        <ProjectsPanel
          projects={projects}
          editMode={editMode}
          activeId={activeProjectId}
          rangeMode={rangeMode}
          sprintStart={sprint.start}
          sprintEnd={sprint.end}
          folders={folders}
          onSelect={switchProject}
          onSinceChange={(id, since) => onProjectUpdate(id, { since })}
          onDeadlineChange={(id, deadline) => onProjectUpdate(id, { deadline })}
          onAdd={onAddProject}
          onCreateReport={date => onCreateReport(date, `project:${activeProjectId}`)}
        />
      ) : activeTracker ? (
        <div className={styles.body}>
          <CalendarHeatmap
            days={activeTracker.days}
            since={activeTracker.since}
            onCreateReport={date => onCreateReport(date, activeTracker.id)}
          />
          <div className={styles.right}>
            <StatsCards
              days={activeTracker.days}
              weekendsOff={activeTracker.weekendsOff}
              rangeMode={rangeMode}
              sprintStart={sprint.start}
              sprintEnd={sprint.end}
              today={todayStr}
            />
            {editMode && (
              <DatePickerPopover
                value={activeTracker.since}
                onChange={v => onSinceChange(activeTracker.id, v)}
                label="Отслеживать с:"
              />
            )}
          </div>
        </div>
      ) : null}
    </div>
  )
}
