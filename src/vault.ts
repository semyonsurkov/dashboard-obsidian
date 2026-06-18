import { App, TFile, TFolder } from 'obsidian'
import type { HistoryDay, Project, Sprint } from './types'
import { sprintByOffset } from './stats'
import { weeklyNotePath, parseSprintNote } from './sprintNote'
import type { DashboardSettings } from './settings'

// ─── Types ─────────────────────────────────────────────────────────────────────

export interface DashboardData {
  personalDays:   HistoryDay[]
  workDays:       HistoryDay[]
  projects:       Project[]
  sprints:        Sprint[]
  folders:        string[]
}

export async function ensureFolder(app: App, folderPath: string): Promise<TFolder | null> {
  const clean = folderPath.trim().replace(/^\/+|\/+$/g, '')
  if (!clean) return null

  const existing = app.vault.getAbstractFileByPath(clean)
  if (existing instanceof TFolder) return existing

  const parts = clean.split('/').filter(Boolean)
  let current = ''

  for (const part of parts) {
    current = current ? `${current}/${part}` : part
    const found = app.vault.getAbstractFileByPath(current)
    if (found instanceof TFolder) continue
    await app.vault.createFolder(current)
  }

  const created = app.vault.getAbstractFileByPath(clean)
  return created instanceof TFolder ? created : null
}

export async function createUniqueMarkdownFile(app: App, folderPath: string, basename: string, content: string): Promise<TFile> {
  await ensureFolder(app, folderPath)

  const safeBase = basename.trim().replace(/[\\/:|#^[\]]/g, ' ').replace(/\s+/g, ' ') || 'Заметка'
  let path = `${folderPath}/${safeBase}.md`
  let n = 2

  while (app.vault.getAbstractFileByPath(path)) {
    path = `${folderPath}/${safeBase} ${n}.md`
    n += 1
  }

  return app.vault.create(path, content)
}

async function ensureMarkdownFile(app: App, path: string, content: string): Promise<TFile | null> {
  const existing = app.vault.getAbstractFileByPath(path)
  if (existing instanceof TFile) return existing

  const folder = path.split('/').slice(0, -1).join('/')
  if (folder) await ensureFolder(app, folder)

  return app.vault.create(path, content)
}

export async function bootstrapDashboardVault(app: App, settings: DashboardSettings): Promise<void> {
  const folders = [
    settings.personalFolder,
    settings.workFolder,
    settings.weeklyFolder,
    ...settings.projects.map(p => p.folder),
  ].filter(Boolean)

  for (const folder of folders) {
    await ensureFolder(app, folder)
  }

  for (const project of settings.projects) {
    await ensureMarkdownFile(
      app,
      `${project.folder}/Обзор.md`,
      `# ${project.name}\n\n## Цель\n\n## Текущий фокус\n\n## Решения\n\n## Следующие действия\n`,
    )
  }
}

export function getAllFolderPaths(app: App): string[] {
  return app.vault.getAllLoadedFiles()
    .filter((f): f is TFolder => f instanceof TFolder && f.path !== '' && f.path !== '/')
    .map(f => f.path)
    .sort()
}

// ─── Date tracker ──────────────────────────────────────────────────────────────

export async function readDateTracker(app: App, folderPath: string): Promise<HistoryDay[]> {
  const folder = app.vault.getAbstractFileByPath(folderPath)
  if (!(folder instanceof TFolder)) return []

  const DATE_RE = /^(\d{2})-(\d{2})-(\d{4})\.md$/
  const days: HistoryDay[] = []

  for (const child of folder.children) {
    if (!(child instanceof TFile)) continue
    const m = DATE_RE.exec(child.name)
    if (!m) continue

    const [, dd, mm, yyyy] = m
    const iso = `${yyyy}-${mm}-${dd}`

    let text = ''
    try {
      const content = await app.vault.cachedRead(child)
      const lines = content.split('\n')
      let inFrontmatter = false, pastFrontmatter = false, inBody = false
      for (const line of lines) {
        const trimmed = line.trim()
        if (!pastFrontmatter && trimmed === '---') {
          if (!inFrontmatter) { inFrontmatter = true; continue }
          inFrontmatter = false; pastFrontmatter = true; continue
        }
        if (inFrontmatter) continue
        if (trimmed.startsWith('#')) { inBody = true; continue }
        if (inBody && trimmed && !trimmed.startsWith('#')) {
          text = trimmed
            .replace(/\*\*([^*]+)\*\*/g, '$1')
            .replace(/\*([^*]+)\*/g, '$1')
            .replace(/`([^`]+)`/g, '$1')
            .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
            .replace(/^[-*+]\s+/, '')
            .replace(/^\d+\.\s*/, '')
          break
        }
      }
    } catch {
      // leave text empty if read fails
    }

    days.push({ date: iso, reported: true, text, filePath: child.path })
  }

  return days.sort((a, b) => a.date.localeCompare(b.date))
}

// ─── Sprints ───────────────────────────────────────────────────────────────────

export const SPRINT_RANGE = 4

export async function buildSprints(
  app: App,
  today: string,
  settings: DashboardSettings,
): Promise<Sprint[]> {
  const sprints: Sprint[] = []

  for (let offset = -SPRINT_RANGE; offset <= 1; offset++) {
    const info = sprintByOffset(today, offset)
    const path = weeklyNotePath(info.weekNumber, info.year, settings)
    const file = app.vault.getAbstractFileByPath(path)
    const created = file instanceof TFile

    let goalsPersonal: string[] = []
    let goalsWork:     string[] = []
    let summary: string | undefined
    let retro:   string | undefined

    if (created && file instanceof TFile) {
      try {
        const content = await app.vault.cachedRead(file)
        const parsed  = parseSprintNote(content)
        goalsPersonal = parsed.goalsPersonal
        goalsWork     = parsed.goalsWork
        summary       = parsed.summary
        retro         = parsed.retro
      } catch {
        // leave fields empty
      }
    }

    sprints.push({ weekNumber: info.weekNumber, year: info.year, start: info.start, end: info.end, goalsPersonal, goalsWork, summary, retro, created })
  }

  return sprints
}

// ─── Main assembler ────────────────────────────────────────────────────────────

export async function buildDashboardData(
  app: App,
  today: string,
  settings: DashboardSettings,
): Promise<DashboardData> {
  const [personalDays, workDays, sprints] = await Promise.all([
    readDateTracker(app, settings.personalFolder),
    readDateTracker(app, settings.workFolder),
    buildSprints(app, today, settings),
  ])

  const projects: Project[] = await Promise.all(
    settings.projects.map(async cfg => ({
      id:       cfg.id,
      name:     cfg.name,
      folder:   cfg.folder,
      since:    cfg.since,
      deadline: cfg.deadline,
      days:     await readDateTracker(app, cfg.folder),
    }))
  )

  const folders = getAllFolderPaths(app)

  return { personalDays, workDays, projects, sprints, folders }
}
