import React from 'react'
import { createRoot } from 'react-dom/client'
import { DashboardApp } from '../ui/App'
import { sprintByOffset } from '../stats'
import type { DashboardData } from '../vault'
import type { Sprint, HistoryDay, Project } from '../types'

function localISO(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function daysBack(n: number): string {
  const d = new Date()
  d.setDate(d.getDate() - n)
  return localISO(d)
}

const today = localISO(new Date())

const TEXTS = [
  'Разобрался с горутинами, написал пример с каналами',
  'Прочитал главу про интерфейсы, сделал практику',
  'Дебажил утечку памяти — нашёл, причина в closure',
  'Code review, задеплоил фичу на стейдж',
  'Написал unit-тесты для auth модуля',
]

const personalDays: HistoryDay[] = Array.from({ length: 50 }, (_, i) => {
  const iso = daysBack(49 - i)
  const dow = new Date(iso + 'T12:00:00').getDay()
  const reported = dow !== 0 && i % 3 !== 1
  return { date: iso, reported, text: reported ? TEXTS[i % TEXTS.length] : '', filePath: reported ? `mock/${iso}.md` : undefined }
})

const workDays: HistoryDay[] = Array.from({ length: 50 }, (_, i) => {
  const iso = daysBack(49 - i)
  const dow = new Date(iso + 'T12:00:00').getDay()
  if (dow === 0 || dow === 6) return null
  const reported = i % 4 !== 2
  return { date: iso, reported, text: reported ? 'Задеплоил API v2, прошло code review' : '', filePath: reported ? `mock-work/${iso}.md` : undefined }
}).filter(Boolean) as HistoryDay[]

const verbaDays: HistoryDay[] = Array.from({ length: 30 }, (_, i) => {
  const iso = daysBack(29 - i)
  const reported = i % 2 === 0
  return { date: iso, reported, text: reported ? 'Unit 5 complete' : '' }
})

function makeSprint(offset: number): Sprint {
  const info = sprintByOffset(today, offset)
  return {
    weekNumber:    info.weekNumber,
    year:          info.year,
    start:         info.start,
    end:           info.end,
    goalsPersonal: offset === 0 ? ['Сделать preview для дашборда', 'Дочитать книгу Go'] : [],
    goalsWork:     offset === 0 ? ['Задеплоить API v2', 'Написать RFC для авторизации'] : [],
    summary:       offset < 0 ? 'Хорошая неделя, выполнил основные цели' : undefined,
    retro:         offset < 0 && offset > -2 ? 'Надо планировать больше буфера на ревью' : undefined,
    created:       offset <= 0,
  }
}

const sprints: Sprint[] = [-3, -2, -1, 0, 1].map(makeSprint)

const projects: Project[] = [
  {
    id:       'verba',
    name:     'Verba',
    folder:   '2 💻 Work/Verba',
    since:    '2026-01-01',
    deadline: '2026-09-01',
    days:     verbaDays,
  },
]

const mockData: DashboardData = {
  personalDays,
  workDays,
  projects,
  sprints,
  goNotes: [
    { name: 'Заметка 2026-06-17', path: '1 ⚙️ Base/GO/Заметка 2026-06-17.md' },
    { name: 'Промпт для понимания темы в гошке', path: '1 ⚙️ Base/GO/Промпт для понимания темы в гошке.md' },
    { name: 'Вопросы по бэку', path: '1 ⚙️ Base/GO/Вопросы по бэку.md' },
    { name: 'Промпт для подготовки к собеседованиям', path: '1 ⚙️ Base/GO/Промпт для подготовки к собеседованиям.md' },
  ],
  englishNotes: [
    { name: 'Education\'s log - Topics', path: '1 ⚙️ Base/English/Education\'s log - Topics.md' },
    { name: 'English Progress Log', path: '1 ⚙️ Base/English/English Progress Log.md' },
    { name: 'Weekly Plan', path: '1 ⚙️ Base/English/Weekly Plan.md' },
    { name: 'Questions with DO', path: '1 ⚙️ Base/English/Questions with DO.md' },
    { name: 'How to think in English', path: '1 ⚙️ Base/English/How to think in English.md' },
  ],
  folders: [
    '1 ⚙️ Base', '1 ⚙️ Base/GO', '1 ⚙️ Base/English', '1 ⚙️ Base/daily',
    '1 ⚙️ Base/periodic/weekly', '1 ⚙️ Base/periodic/monthly',
    '2 💻 Work', '2 💻 Work/Verba', '2 💻 Work/Отчет за каждый день',
    '3 🌱 Growth', '3 🌱 Growth/Books', '4 📦 Archive', '0 Inbox',
  ],
}

const settings = {
  personalFolder:   '1 ⚙️ Base/daily',
  workFolder:       '2 💻 Work/Отчет за каждый день',
  workWeekendsOff:  true,
  personalTemplate: '',
  workTemplate:     '',
  projects:         [{ id: 'verba', name: 'Verba', folder: '2 💻 Work/Verba', since: '2026-01-01', deadline: '2026-09-01' }],
  projectTemplate:  '',
  weeklyFolder:     '1 ⚙️ Base/periodic/weekly',
  sprintTemplate:   '',
  goFolder:         '1 ⚙️ Base/GO',
  englishFolder:    '1 ⚙️ Base/English',
  mainBlockOrder:   ['tracker', 'history'] as string[],
  sideBlockOrder:   ['go', 'english'] as string[],
}

const el = document.getElementById('app')!
el.className = 'dashboard-view-root'

createRoot(el).render(
  React.createElement(DashboardApp, {
    data:            mockData,
    today,
    settings,
    onCreateSprint:  async (wn, y)       => console.log('create sprint', wn, y),
    onOpenNote:      async (wn, y, s)    => console.log('open note', wn, y, s),
    onCreateReport:  async (date, id)    => console.log('create report', date, id),
    onOpenQuickNote: async (path)        => console.log('open note', path),
    onNewQuickNote:  async (folder)      => console.log('new note in', folder),
    onNewProject:    async (name, folder, deadline) => console.log('new project', name, folder, deadline),
    onProjectUpdate: async (id, patch)   => console.log('update project', id, patch),
  }),
)
