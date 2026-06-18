import { useState, useMemo } from 'react'
import {
  DndContext, closestCenter,
  KeyboardSensor, PointerSensor, useSensor, useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import {
  SortableContext, arrayMove, verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { GripVertical, NotebookPen, Briefcase, Settings } from 'lucide-react'
import { Button, ActionIcon } from '@mantine/core'
import { notifications } from '@mantine/notifications'
import { sprintByOffset } from '../stats'
import type { Tracker, Project, TrackerId, BlockId, HistoryDay } from '../types'
import type { DashboardData } from '../vault'
import type { DashboardSettings } from '../settings'
import SprintHero    from './components/SprintHero'
import SprintBody    from './components/SprintBody'
import TrackerBlock  from './components/TrackerBlock'
import TimelineBlock from './components/TimelineBlock'
import SortableItem  from './components/SortableItem'
import LiveDate      from './components/LiveDate'
import styles from './App.module.css'

// ─── Props ────────────────────────────────────────────────────────────────────

const SPRINT_RANGE = 4

interface Props {
  data:      DashboardData
  today:     string
  settings:  DashboardSettings
  onCreateSprint:  (weekNumber: number, year: number) => Promise<void>
  onOpenNote:      (weekNumber: number, year: number, section: 'goals' | 'summary' | 'retro') => Promise<void>
  onCreateReport:  (date: string, trackerId: string) => Promise<void>
  onNewProject:    (name: string, folder: string, deadline?: string) => Promise<void>
  onProjectUpdate: (id: string, patch: Partial<Project>) => Promise<void>
  onOpenSettings:  () => void
  onOrderChange?:   (main: BlockId[]) => void
  onOpenReport?:    (date: string, filePath: string, trackerId: string) => void
  onDeleteReport?:  (date: string, filePath: string, trackerId: string) => void
}

// ─── App ──────────────────────────────────────────────────────────────────────

export function DashboardApp({
  data, today, settings,
  onCreateSprint, onOpenNote, onCreateReport,
  onNewProject, onProjectUpdate, onOpenSettings, onOrderChange, onOpenReport, onDeleteReport,
}: Props) {
  const [editMode, setEditMode]               = useState(false)
  const [mainOrder, setMainOrder]             = useState<BlockId[]>((settings.mainBlockOrder as BlockId[]) ?? ['tracker', 'history'])
  const [weekOffset, setWeekOffset]           = useState(0)
  const [activeDays, setActiveDays]           = useState<HistoryDay[]>(data.personalDays)
  const [activeTrackerId, setActiveTrackerId] = useState<string>('personal')

  const trackers = useMemo<Tracker[]>(() => [
    {
      id: 'personal', label: 'Личный отчёт', icon: NotebookPen,
      days: data.personalDays, weekendsOff: false,
      since: data.personalDays[0]?.date ?? today,
    },
    {
      id: 'work', label: 'Рабочий отчёт', icon: Briefcase,
      days: data.workDays, weekendsOff: settings.workWeekendsOff,
      since: data.workDays[0]?.date ?? today,
    },
  ], [data.personalDays, data.workDays, settings.workWeekendsOff, today])

  const sprintInfo = useMemo(() => sprintByOffset(today, weekOffset), [today, weekOffset])
  const sprintMock = useMemo(
    () => data.sprints.find(s => s.weekNumber === sprintInfo.weekNumber && s.year === sprintInfo.year),
    [data.sprints, sprintInfo.weekNumber, sprintInfo.year],
  )
  const sprint = useMemo(() => ({
    ...sprintInfo,
    goalsPersonal: sprintMock?.goalsPersonal ?? [],
    goalsWork:     sprintMock?.goalsWork ?? [],
    summary:       sprintMock?.summary,
    retro:         sprintMock?.retro,
    created:       sprintMock?.created ?? false,
  }), [sprintInfo, sprintMock])

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor),
  )

  function handleMainDragEnd(e: DragEndEvent) {
    const { active, over } = e
    if (over && active.id !== over.id) {
      const next = arrayMove(mainOrder, mainOrder.indexOf(active.id as BlockId), mainOrder.indexOf(over.id as BlockId))
      setMainOrder(next)
      onOrderChange?.(next)
    }
  }

  function handleSelectSprint(weekNumber: number, year: number) {
    const target = data.sprints.find(s => s.weekNumber === weekNumber && s.year === year)
    if (!target) return
    const todayDate = new Date(today + 'T12:00:00')
    const dow = (todayDate.getDay() + 6) % 7
    const curMon = new Date(todayDate)
    curMon.setDate(todayDate.getDate() - dow)
    const tgtMon = new Date(target.start + 'T12:00:00')
    setWeekOffset(Math.round((tgtMon.getTime() - curMon.getTime()) / (7 * 86400000)))
  }

  async function handleCreateSprint() {
    try {
      await onCreateSprint(sprint.weekNumber, sprint.year)
      notifications.show({ color: 'green', message: `Спринт W${sprint.weekNumber} создан` })
    } catch {
      notifications.show({ color: 'red', message: `Не удалось создать спринт W${sprint.weekNumber}` })
    }
  }

  async function handleOpenNote(section: 'goals' | 'summary' | 'retro') {
    await onOpenNote(sprint.weekNumber, sprint.year, section)
  }

  async function handleCreateReport(date: string, trackerId: string) {
    await onCreateReport(date, trackerId)
  }

  const blocks: Record<BlockId, React.ReactNode> = {
    tracker: (
      <TrackerBlock
        trackers={trackers}
        projects={data.projects}
        editMode={editMode}
        sprint={sprint}
        folders={data.folders}
        onSinceChange={(_id: TrackerId, _since: string) => {}}
        onProjectUpdate={onProjectUpdate}
        onAddProject={onNewProject}
        onActiveDaysChange={setActiveDays}
        onActiveTrackerChange={setActiveTrackerId}
        onCreateReport={handleCreateReport}
        onOpenReport={onOpenReport}
        onDeleteReport={onDeleteReport}
      />
    ),
    history: (
      <TimelineBlock
        sourceDays={activeDays}
        onOpenByDate={date => handleCreateReport(date, activeTrackerId)}
        onOpenReport={(date, fp) => onOpenReport?.(date, fp, activeTrackerId)}
        onDeleteReport={(date, fp) => onDeleteReport?.(date, fp, activeTrackerId)}
      />
    ),
  }

  return (
    <div className={styles.root}>
      <div className={styles.topbar}>
        <LiveDate />
        <div className={styles.topbar_actions}>
          <ActionIcon
            variant={editMode ? 'light' : 'subtle'}
            size="md"
            onClick={() => setEditMode(v => !v)}
            aria-pressed={editMode}
            aria-label={editMode ? 'Выйти из режима компоновки' : 'Компоновка'}
          >
            <GripVertical size={16} aria-hidden />
          </ActionIcon>
          <ActionIcon
            variant="subtle"
            size="md"
            onClick={onOpenSettings}
            aria-label="Настройки"
          >
            <Settings size={16} aria-hidden />
          </ActionIcon>
        </div>
      </div>

      <SprintHero
        sprint={sprint}
        sprints={data.sprints}
        trackers={trackers}
        onWrite={id => handleCreateReport(today, id)}
        onPrev={() => setWeekOffset(v => Math.max(-SPRINT_RANGE, v - 1))}
        onNext={() => setWeekOffset(v => Math.min(1, v + 1))}
        onSelectSprint={handleSelectSprint}
        onCreateSprint={handleCreateSprint}
        onOpenNote={handleOpenNote}
      />

      <SprintBody
        sprint={sprint}
        trackers={trackers}
        onOpenReport={(date, fp, trackerId) => onOpenReport?.(date, fp, trackerId)}
        onCreateReport={(date, trackerId) => handleCreateReport(date, trackerId)}
      />

      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleMainDragEnd}>
        <SortableContext items={mainOrder} strategy={verticalListSortingStrategy}>
          <div className={styles.blocks}>
            {mainOrder.map(id => (
              <SortableItem key={id} id={id} editMode={editMode}>
                {blocks[id]}
              </SortableItem>
            ))}
          </div>
        </SortableContext>
      </DndContext>
    </div>
  )
}
