import { App, TFile } from 'obsidian'
import type { DashboardSettings } from './settings'

// ─── Path ──────────────────────────────────────────────────────────────────────

export function weeklyNotePath(weekNumber: number, year: number, settings: DashboardSettings): string {
  const ww = String(weekNumber).padStart(2, '0')
  return `${settings.weeklyFolder}/${year}-W${ww}.md`
}

// ─── Parse ─────────────────────────────────────────────────────────────────────

export interface SprintNoteContent {
  goalsPersonal: string[]
  goalsWork:     string[]
  summary?:      string
  retro?:        string
}

export function parseSprintNote(content: string): SprintNoteContent {
  const lines = content.split('\n')

  type Section = 'goals' | 'summary' | 'retro' | null
  type GoalSub = 'personal' | 'work' | null

  let section:    Section = null
  let goalSub:    GoalSub = null
  const goalsPersonal: string[] = []
  const goalsWork:     string[] = []
  const summaryLines:  string[] = []
  const retroLines:    string[] = []

  for (const line of lines) {
    const t = line.trim()

    if (t === '## Цели')   { section = 'goals';   goalSub = null; continue }
    if (t === '## Итог')   { section = 'summary';               ; continue }
    if (t === '## Ретро')  { section = 'retro';                 ; continue }
    if (t.startsWith('## ')) { section = null;                   ; continue }

    if (section === 'goals') {
      if (t === '### Личное' || t === '### Личных') { goalSub = 'personal'; continue }
      if (t === '### Работа' || t === '### Рабочих') { goalSub = 'work';   continue }
      if (t.startsWith('### ')) { goalSub = null; continue }

      if (t.startsWith('- ') || t.startsWith('* ')) {
        const text = t.slice(2).trim()
        if (!text) continue
        if (goalSub === 'personal')      goalsPersonal.push(text)
        else if (goalSub === 'work')     goalsWork.push(text)
        else                             goalsPersonal.push(text) // no subsection → personal
      }
      continue
    }

    if (section === 'summary' && t) { summaryLines.push(t); continue }
    if (section === 'retro'   && t) { retroLines.push(t);   continue }
  }

  return {
    goalsPersonal,
    goalsWork,
    summary: summaryLines.length ? summaryLines.join('\n') : undefined,
    retro:   retroLines.length   ? retroLines.join('\n')   : undefined,
  }
}

// ─── Create ────────────────────────────────────────────────────────────────────

function sprintTemplate(weekNumber: number, year: number): string {
  return `# Спринт W${weekNumber} (${year})

## Цели

### Личное
-

### Работа
-

## Итог

## Ретро
`
}

export async function createSprintNote(
  app: App,
  weekNumber: number,
  year: number,
  settings: DashboardSettings,
  dateStart?: string,
  dateEnd?: string,
): Promise<TFile> {
  const path = weeklyNotePath(weekNumber, year, settings)

  const existing = app.vault.getAbstractFileByPath(path)
  if (existing instanceof TFile) return existing

  const folder = settings.weeklyFolder
  if (!app.vault.getAbstractFileByPath(folder)) {
    await app.vault.createFolder(folder)
  }

  let content = sprintTemplate(weekNumber, year)

  if (settings.sprintTemplate) {
    const tplFile = app.vault.getAbstractFileByPath(settings.sprintTemplate)
    if (tplFile instanceof TFile) {
      const ww = String(weekNumber).padStart(2, '0')
      let tpl  = await app.vault.cachedRead(tplFile)
      tpl = tpl
        .split('{{week}}').join(`W${ww}`)
        .split('{{year}}').join(String(year))
        .split('{{date_start}}').join(dateStart ?? '')
        .split('{{date_end}}').join(dateEnd ?? '')
        .split('{{date}}').join(dateStart ?? '')
      content = tpl
    }
  }

  return app.vault.create(path, content)
}

// ─── Open ──────────────────────────────────────────────────────────────────────

export async function openSprintNote(
  app: App,
  weekNumber: number,
  year: number,
  settings: DashboardSettings,
  section?: 'goals' | 'summary' | 'retro',
): Promise<void> {
  const path = weeklyNotePath(weekNumber, year, settings)
  const file = app.vault.getAbstractFileByPath(path)
  if (!(file instanceof TFile)) return

  const leaf = app.workspace.getLeaf(false)
  await leaf.openFile(file)

  // Scroll to the heading after the editor renders
  if (section) {
    const headingText = section === 'goals' ? 'Цели' : section === 'summary' ? 'Итог' : 'Ретро'
    setTimeout(() => {
      const editor = app.workspace.activeEditor?.editor
      if (!editor) return
      const content = editor.getValue()
      const idx = content.indexOf(`## ${headingText}`)
      if (idx < 0) return
      const line = content.slice(0, idx).split('\n').length - 1
      editor.setCursor({ line, ch: 0 })
      editor.scrollIntoView({ from: { line, ch: 0 }, to: { line, ch: 0 } }, true)
    }, 150)
  }
}
