import { useState, useMemo, type ReactNode } from 'react'
import {
  DndContext, closestCenter,
  KeyboardSensor, PointerSensor, useSensor, useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import {
  SortableContext, arrayMove, verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { GripVertical, BookOpen, Globe, NotebookPen, Briefcase } from 'lucide-react'
import { Button } from './components/ui/button'
import { Toaster } from './components/ui/sonner'
import { toast } from 'sonner'
import { sprintByOffset } from '../stats'
import type { Tracker, Project, TrackerId, BlockId, HistoryDay } from '../types'
import type { DashboardData } from '../vault'
import type { DashboardSettings } from '../settings'
import SprintHero    from './components/SprintHero'
import SprintBody    from './components/SprintBody'
import TrackerBlock  from './components/TrackerBlock'
import TimelineBlock from './components/TimelineBlock'
import QuickBlock    from './components/QuickBlock'
import SortableItem  from './components/SortableItem'
import LiveDate      from './components/LiveDate'
import './styles/globals.css'
import './styles/tokens.css'
import './styles/shared.css'
import './styles/calendar.css'
import './App.css'

// ─── Props ────────────────────────────────────────────────────────────────────

interface Props {
  data:      DashboardData
  today:     string
  settings:  DashboardSettings
  onCreateSprint:  (weekNumber: number, year: number) => Promise<void>
  onOpenNote:      (weekNumber: number, year: number, section: 'goals' | 'summary' | 'retro') => Promise<void>
  onCreateReport:  (date: string, trackerId: string) => Promise<void>
  onOpenQuickNote: (notePath: string) => Promise<void>
  onNewQuickNote:  (folderPath: string) => Promise<void>
  onNewProject:    (name: string, folder: string, deadline?: string) => Promise<void>
  onProjectUpdate: (id: string, patch: Partial<Project>) => Promise<void>
}

// ─── App ──────────────────────────────────────────────────────────────────────

export function DashboardApp({
  data, today, settings,
  onCreateSprint, onOpenNote, onCreateReport, onOpenQuickNote, onNewQuickNote,
  onNewProject, onProjectUpdate,
}: Props) {
  const [editMode, setEditMode]     = useState(false)
  const [mainOrder, setMainOrder]   = useState<BlockId[]>((settings.mainBlockOrder as BlockId[]) ?? ['tracker', 'history'])
  const [sideOrder, setSideOrder]   = useState<string[]>(settings.sideBlockOrder ?? ['go', 'english'])
  const [weekOffset, setWeekOffset] = useState(0)
  const [activeDays, setActiveDays] = useState<HistoryDay[]>(data.personalDays)

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
      setMainOrder(prev => arrayMove(prev, prev.indexOf(active.id as BlockId), prev.indexOf(over.id as BlockId)))
    }
  }

  function handleSideDragEnd(e: DragEndEvent) {
    const { active, over } = e
    if (over && active.id !== over.id) {
      setSideOrder(prev => arrayMove(prev, prev.indexOf(active.id as string), prev.indexOf(over.id as string)))
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
    await onCreateSprint(sprint.weekNumber, sprint.year)
    toast(`Спринт W${sprint.weekNumber} создан`)
  }

  async function handleOpenNote(section: 'goals' | 'summary' | 'retro') {
    await onOpenNote(sprint.weekNumber, sprint.year, section)
  }

  async function handleCreateReport(date: string, trackerId: string) {
    await onCreateReport(date, trackerId)
  }

  const goNoteNames  = data.goNotes.map(n => n.name)
  const engNoteNames = data.englishNotes.map(n => n.name)

  const mainBlocks: Record<BlockId, ReactNode> = {
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
        onCreateReport={handleCreateReport}
      />
    ),
    history: <TimelineBlock sourceDays={activeDays} onOpenDay={onOpenQuickNote} />,
  }

  const sideBlocks: Record<string, ReactNode> = {
    go: (
      <QuickBlock
        title="Go"
        icon={BookOpen}
        iconClass="icon_go"
        hubNote={settings.goFolder + '/Go база.md'}
        onHubClick={() => onOpenQuickNote(`${settings.goFolder}/Go база.md`)}
        notes={goNoteNames}
        onNoteClick={name => onOpenQuickNote(`${settings.goFolder}/${name}.md`)}
        onNewNote={() => onNewQuickNote(settings.goFolder)}
      />
    ),
    english: (
      <QuickBlock
        title="English"
        icon={Globe}
        iconClass="icon_english"
        hubNote={settings.englishFolder + '/English база.md'}
        onHubClick={() => onOpenQuickNote(`${settings.englishFolder}/English база.md`)}
        notes={engNoteNames}
        onNoteClick={name => onOpenQuickNote(`${settings.englishFolder}/${name}.md`)}
        onNewNote={() => onNewQuickNote(settings.englishFolder)}
      />
    ),
  }

  return (
    <div className="db_root">
      <div className="db_toolbar">
        <div className="db_toolbar_left">
          <LiveDate />
        </div>
        <Button
          variant="ghost"
          size="sm"
          className={editMode ? 'is_active' : ''}
          onClick={() => setEditMode(v => !v)}
          aria-pressed={editMode}
        >
          <GripVertical size={14} aria-hidden />
          {editMode ? 'Готово' : 'Настроить'}
        </Button>
      </div>

      <SprintHero
        sprint={sprint}
        sprints={data.sprints}
        trackers={trackers}
        onWrite={id => handleCreateReport(today, id)}
        onPrev={() => setWeekOffset(v => v - 1)}
        onNext={() => setWeekOffset(v => v + 1)}
        onSelectSprint={handleSelectSprint}
        onCreateSprint={handleCreateSprint}
        onOpenNote={handleOpenNote}
      />

      <SprintBody sprint={sprint} trackers={trackers} />

      <div className="db_bento">
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleMainDragEnd}>
          <SortableContext items={mainOrder} strategy={verticalListSortingStrategy}>
            <div className="db_main_col">
              {mainOrder.map(id => (
                <SortableItem key={id} id={id} editMode={editMode}>
                  {mainBlocks[id]}
                </SortableItem>
              ))}
            </div>
          </SortableContext>
        </DndContext>

        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleSideDragEnd}>
          <SortableContext items={sideOrder} strategy={verticalListSortingStrategy}>
            <div className="db_sidebar">
              {sideOrder.map(id => (
                <SortableItem key={id} id={id} editMode={editMode}>
                  {sideBlocks[id]}
                </SortableItem>
              ))}
            </div>
          </SortableContext>
        </DndContext>
      </div>

      <Toaster position="bottom-right" richColors />
    </div>
  )
}
