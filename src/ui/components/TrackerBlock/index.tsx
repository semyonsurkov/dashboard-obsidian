import { useState, useMemo, useEffect } from 'react'
import { NotebookPen, Briefcase, Layers, Activity } from 'lucide-react'
import { Card, SegmentedControl, Chip, Group } from '@mantine/core'
import CalendarHeatmap from '../CalendarHeatmap'
import StatsCards from '../StatsCards'
import DatePickerPopover from '../DatePickerPopover'
import ProjectsPanel from '../ProjectsPanel'
import type { Tracker, Project, TrackerId, MainTab, RangeMode, HistoryDay } from '../../../types'
import type { SprintInfo } from '../../../stats'
import styles from './styles.module.css'

interface Props {
  trackers:               Tracker[]
  projects:               Project[]
  editMode:               boolean
  sprint:                 SprintInfo
  folders:                string[]
  onSinceChange:          (id: TrackerId, since: string) => void
  onProjectUpdate:        (id: string, patch: Partial<Project>) => void
  onAddProject:           (name: string, folder: string, deadline?: string) => Promise<void>
  onActiveDaysChange:     (days: HistoryDay[]) => void
  onActiveTrackerChange?: (trackerId: string) => void
  onCreateReport:   (date: string, trackerId: string) => void
  onOpenReport?:    (date: string, filePath: string, trackerId: string) => void
  onDeleteReport?:  (date: string, filePath: string, trackerId: string) => void
}

export default function TrackerBlock({
  trackers, projects, editMode, sprint, folders,
  onSinceChange, onProjectUpdate, onAddProject, onActiveDaysChange, onActiveTrackerChange, onCreateReport, onOpenReport, onDeleteReport,
}: Props) {
  const [activeTab, setActiveTab]             = useState<MainTab>(trackers[0]?.id ?? 'personal')
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
    if (!projects.find(p => p.id === activeProjectId)) {
      setActiveProjectId(projects[0]?.id ?? '')
    }
  }, [projects]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    onActiveDaysChange(activeDays)
    const tid = isProjects ? `project:${activeProjectId}` : activeTab
    onActiveTrackerChange?.(tid)
  }, [activeDays]) // eslint-disable-line react-hooks/exhaustive-deps

  const _now     = new Date()
  const todayStr = `${_now.getFullYear()}-${String(_now.getMonth()+1).padStart(2,'0')}-${String(_now.getDate()).padStart(2,'0')}`

  const rangeData = [
    { value: 'all',    label: 'Всё время' },
    { value: 'sprint', label: 'Спринт'    },
  ]

  return (
    <Card withBorder p={0} radius="md">
      <div className={styles.header}>
        <div className={styles.header_top}>
          <div className={styles.header_title}>
            <Activity size={14} aria-hidden style={{ color: 'var(--mantine-color-dark-2)' }} />
            <span className={styles.title_text}>Активность</span>
          </div>
          <SegmentedControl
            data={rangeData}
            value={rangeMode}
            onChange={v => setRangeMode(v as RangeMode)}
            size="xs"
          />
        </div>
        <Chip.Group value={activeTab} onChange={v => setActiveTab(v as MainTab)}>
          <Group gap="xs" wrap="wrap">
            <Chip value="personal" size="xs" icon={<NotebookPen size={12} />}>
              Личный отчёт
            </Chip>
            <Chip value="work" size="xs" icon={<Briefcase size={12} />}>
              Рабочий отчёт
            </Chip>
            <Chip value="projects" size="xs" icon={<Layers size={12} />}>
              Проекты
            </Chip>
          </Group>
        </Chip.Group>
      </div>

      <div className={styles.content}>
        {isProjects ? (
          <ProjectsPanel
            projects={projects}
            editMode={editMode}
            activeId={activeProjectId}
            rangeMode={rangeMode}
            sprintStart={sprint.start}
            sprintEnd={sprint.end}
            folders={folders}
            onSelect={id => setActiveProjectId(id)}
            onSinceChange={(id, since) => onProjectUpdate(id, { since })}
            onDeadlineChange={(id, deadline) => onProjectUpdate(id, { deadline })}
            onAdd={onAddProject}
            onCreateReport={date => onCreateReport(date, `project:${activeProjectId}`)}
          />
        ) : activeTracker ? (
          <div className={styles.tracker_grid}>
            <CalendarHeatmap
              days={activeTracker.days}
              since={activeTracker.since}
              onCreateReport={date => onCreateReport(date, activeTracker.id)}
              onOpenReport={(date, fp) => onOpenReport?.(date, fp, activeTracker.id)}
              onDeleteReport={(date, fp) => onDeleteReport?.(date, fp, activeTracker.id)}
            />
            <div className={styles.stats_col}>
              <StatsCards
                days={activeTracker.days}
                weekendsOff={activeTracker.weekendsOff}
                rangeMode={rangeMode}
                sprintStart={sprint.start}
                sprintEnd={sprint.end}
                today={todayStr}
              />
            </div>
          </div>
        ) : null}
      </div>
    </Card>
  )
}
