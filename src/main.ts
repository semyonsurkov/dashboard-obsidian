import { Plugin, ItemView, WorkspaceLeaf, TFile, TFolder } from 'obsidian'
import { createRoot, type Root } from 'react-dom/client'
import { createElement } from 'react'
import { DashboardApp } from './ui/App'
import { DashboardSettingTab, DEFAULT_SETTINGS, type DashboardSettings } from './settings'
import { buildDashboardData, type DashboardData } from './vault'
import { createSprintNote, openSprintNote } from './sprintNote'

const VIEW_TYPE = 'dashboard-obsidian-view'

function isoWeekDates(weekNumber: number, year: number): { start: string; end: string } {
  const jan4 = new Date(year, 0, 4)
  const dow   = (jan4.getDay() + 6) % 7
  const mon   = new Date(jan4)
  mon.setDate(jan4.getDate() - dow + (weekNumber - 1) * 7)
  const sun = new Date(mon)
  sun.setDate(mon.getDate() + 6)
  const fmt = (d: Date) => d.toISOString().slice(0, 10)
  return { start: fmt(mon), end: fmt(sun) }
}

// ─── ItemView ──────────────────────────────────────────────────────────────────

class DashboardView extends ItemView {
  private root:     Root | null = null
  private plugin:   DashboardPlugin
  private data:     DashboardData | null = null
  private timer:    ReturnType<typeof setTimeout> | null = null

  constructor(leaf: WorkspaceLeaf, plugin: DashboardPlugin) {
    super(leaf)
    this.plugin = plugin
  }

  getViewType()    { return VIEW_TYPE }
  getDisplayText() { return 'Dashboard' }
  getIcon()        { return 'gauge' }

  async onOpen() {
    this.contentEl.addClass('dashboard-view-root')
    this.root = createRoot(this.contentEl)
    await this.refresh()

    this.registerEvent(this.app.vault.on('create',  () => this.scheduleRefresh()))
    this.registerEvent(this.app.vault.on('delete',  () => this.scheduleRefresh()))
    this.registerEvent(this.app.vault.on('rename',  () => this.scheduleRefresh()))
    this.registerEvent(this.app.vault.on('modify',  () => this.scheduleRefresh()))
    this.registerEvent(this.app.metadataCache.on('changed', () => this.scheduleRefresh()))
  }

  onClose(): Promise<void> {
    if (this.timer) clearTimeout(this.timer)
    this.root?.unmount()
    this.root = null
    return Promise.resolve()
  }

  private scheduleRefresh() {
    if (this.timer) clearTimeout(this.timer)
    this.timer = setTimeout(() => this.refresh(), 400)
  }

  async refresh() {
    const today = new Date().toISOString().slice(0, 10)
    this.data   = await buildDashboardData(this.app, today, this.plugin.settings)
    this.render(today)
  }

  private render(today: string) {
    if (!this.root || !this.data) return
    const { data, plugin } = this

    this.root.render(
      createElement(DashboardApp, {
        data,
        today,
        settings: plugin.settings,

        onCreateSprint: async (weekNumber: number, year: number) => {
          const { start, end } = isoWeekDates(weekNumber, year)
          await createSprintNote(this.app, weekNumber, year, plugin.settings, start, end)
          await this.refresh()
        },

        onOpenNote: async (weekNumber: number, year: number, section: 'goals' | 'summary' | 'retro') => {
          await openSprintNote(this.app, weekNumber, year, plugin.settings, section)
        },

        onCreateReport: async (date: string, trackerId: string) => {
          await this.createDailyNote(date, trackerId)
        },

        onOpenQuickNote: async (notePath: string) => {
          const file = this.app.vault.getAbstractFileByPath(notePath)
          if (file instanceof TFile) {
            await this.app.workspace.getLeaf('tab').openFile(file)
          }
        },

        onNewQuickNote: async (folderPath: string) => {
          if (!this.app.vault.getAbstractFileByPath(folderPath)) {
            await this.app.vault.createFolder(folderPath)
          }
          const today2 = new Date().toISOString().slice(0, 10)
          const file   = await this.app.vault.create(`${folderPath}/Заметка ${today2}.md`, '')
          await this.app.workspace.getLeaf('tab').openFile(file)
        },

        onNewProject: async (name: string, folder: string, deadline?: string) => {
          const id = `project-${Date.now()}`
          plugin.settings.projects.push({ id, name, folder, since: today, deadline })
          await plugin.saveSettings()
          await this.refresh()
        },

        onProjectUpdate: async (id: string, patch: Partial<{ since: string; deadline: string }>) => {
          const proj = plugin.settings.projects.find(p => p.id === id)
          if (!proj) return
          Object.assign(proj, patch)
          await plugin.saveSettings()
          await this.refresh()
        },
      }),
    )
  }

  // ─── Daily note creation ─────────────────────────────────────────────────────

  private async renderTemplate(templatePath: string, vars: Record<string, string>): Promise<string | null> {
    const file = this.app.vault.getAbstractFileByPath(templatePath)
    if (!(file instanceof TFile)) return null
    let content = await this.app.vault.cachedRead(file)
    for (const [key, val] of Object.entries(vars)) {
      content = content.split(`{{${key}}}`).join(val)
    }
    return content
  }

  private async createDailyNote(date: string, trackerId: string) {
    const [y, mo, d] = date.split('-')
    const filename   = `${d}-${mo}-${y}.md`
    const now        = new Date()
    const time       = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`
    const vars       = { date, title: filename.replace('.md', ''), time }

    let folder:   string
    let tplPath:  string
    let fallback: string

    if (trackerId === 'personal') {
      folder   = this.plugin.settings.personalFolder
      tplPath  = this.plugin.settings.personalTemplate
      fallback = `---\ntype: daily\ndate: ${date}\n---\n\n## Заметки\n\n## Итог дня\n`
    } else if (trackerId === 'work') {
      folder   = this.plugin.settings.workFolder
      tplPath  = this.plugin.settings.workTemplate
      fallback = `# Отчёт за ${date}\n\n## Что сделано\n\n## Блокеры\n\n## Планы на завтра\n`
    } else if (trackerId.startsWith('project:')) {
      const projId = trackerId.slice('project:'.length)
      const proj   = this.plugin.settings.projects.find(p => p.id === projId)
      folder   = proj?.folder ?? this.plugin.settings.projects[0]?.folder ?? ''
      tplPath  = this.plugin.settings.projectTemplate
      fallback = `# ${date}\n\n`
    } else {
      return
    }

    if (!folder) return

    if (!this.app.vault.getAbstractFileByPath(folder)) {
      await this.app.vault.createFolder(folder)
    }

    const path = `${folder}/${filename}`
    let file = this.app.vault.getAbstractFileByPath(path)
    if (!(file instanceof TFile)) {
      const content = tplPath
        ? (await this.renderTemplate(tplPath, vars)) ?? fallback
        : fallback
      file = await this.app.vault.create(path, content)
    }

    if (file instanceof TFile) {
      await this.app.workspace.getLeaf('tab').openFile(file)
    }
  }
}

// ─── Plugin ────────────────────────────────────────────────────────────────────

export default class DashboardPlugin extends Plugin {
  settings!: DashboardSettings

  async onload() {
    await this.loadSettings()

    this.registerView(VIEW_TYPE, leaf => new DashboardView(leaf, this))

    this.addRibbonIcon('gauge', 'Open Dashboard', () => this.activateView())

    this.addCommand({
      id:       'open-dashboard',
      name:     'Open Dashboard',
      callback: () => this.activateView(),
    })

    this.addSettingTab(new DashboardSettingTab(this.app, this))
  }

  onunload() {
    this.app.workspace.detachLeavesOfType(VIEW_TYPE)
  }

  async loadSettings() {
    this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData())
  }

  async saveSettings() {
    await this.saveData(this.settings)
  }

  private async activateView() {
    const { workspace } = this.app
    const existing = workspace.getLeavesOfType(VIEW_TYPE)

    if (existing.length) {
      workspace.revealLeaf(existing[0])
      return
    }

    const leaf = workspace.getLeaf('tab')
    await leaf.setViewState({ type: VIEW_TYPE, active: true })
    workspace.revealLeaf(leaf)
  }
}
