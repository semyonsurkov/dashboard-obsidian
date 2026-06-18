import { Notice, Plugin, ItemView, WorkspaceLeaf, TFile } from 'obsidian'
import { createRoot, type Root } from 'react-dom/client'
import { createElement } from 'react'
import { DashboardApp } from './ui/App'
import { Providers } from './ui/Providers'
import { DashboardSettingTab, DEFAULT_SETTINGS, type DashboardSettings } from './settings'
import { bootstrapDashboardVault, buildDashboardData, createUniqueMarkdownFile, ensureFolder, type DashboardData } from './vault'
import { createSprintNote, openSprintNote } from './sprintNote'

const VIEW_TYPE = 'dashboard-obsidian-view'

function isoWeekDates(weekNumber: number, year: number): { start: string; end: string } {
  const jan4 = new Date(year, 0, 4)
  const dow   = (jan4.getDay() + 6) % 7
  const mon   = new Date(jan4)
  mon.setDate(jan4.getDate() - dow + (weekNumber - 1) * 7)
  const sun = new Date(mon)
  sun.setDate(mon.getDate() + 6)
  const fmt = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
  return { start: fmt(mon), end: fmt(sun) }
}

// ─── ItemView ──────────────────────────────────────────────────────────────────

function obsidianScheme(): 'light' | 'dark' {
  return document.body.classList.contains('theme-light') ? 'light' : 'dark'
}

class DashboardView extends ItemView {
  private root:      Root | null = null
  private plugin:    DashboardPlugin
  private data:      DashboardData | null = null
  private timer:     ReturnType<typeof setTimeout> | null = null
  private lastToday: string = ''

  constructor(leaf: WorkspaceLeaf, plugin: DashboardPlugin) {
    super(leaf)
    this.plugin = plugin
  }

  getViewType()    { return VIEW_TYPE }
  getDisplayText() { return 'Dashboard' }
  getIcon()        { return 'gauge' }

  async onOpen() {
    this.contentEl.addClass('dashboard-view-root')
    document.documentElement.setAttribute('data-mantine-color-scheme', obsidianScheme())
    this.root = createRoot(this.contentEl)
    await this.refresh()

    this.registerEvent(this.app.vault.on('create',  () => this.scheduleRefresh()))
    this.registerEvent(this.app.vault.on('delete',  () => this.scheduleRefresh()))
    this.registerEvent(this.app.vault.on('rename',  () => this.scheduleRefresh()))
    this.registerEvent(this.app.vault.on('modify',  () => this.scheduleRefresh()))
    this.registerEvent(this.app.metadataCache.on('changed', () => this.scheduleRefresh()))
    // Re-render when the user switches Obsidian's light/dark theme
    this.registerEvent(this.app.workspace.on('css-change', () => {
      document.documentElement.setAttribute('data-mantine-color-scheme', obsidianScheme())
      if (this.lastToday) this.render(this.lastToday)
    }))
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
    const today   = this.plugin.todayIso()
    this.lastToday = today
    this.data      = await buildDashboardData(this.app, today, this.plugin.settings)
    this.render(today)
  }

  private render(today: string) {
    if (!this.root || !this.data) return
    const { data, plugin } = this
    const scheme = obsidianScheme()

    this.root.render(
      createElement(Providers, { colorScheme: scheme },
      createElement(DashboardApp, {
        data,
        today,
        settings: plugin.settings,

        onCreateSprint: async (weekNumber: number, year: number) => {
          const { start, end } = isoWeekDates(weekNumber, year)
          await createSprintNote(this.app, weekNumber, year, plugin.settings, start, end)
          await openSprintNote(this.app, weekNumber, year, plugin.settings, 'goals')
          await this.refresh()
        },

        onOpenNote: async (weekNumber: number, year: number, section: 'goals' | 'summary' | 'retro') => {
          await openSprintNote(this.app, weekNumber, year, plugin.settings, section)
        },

        onCreateReport: async (date: string, trackerId: string) => {
          await this.createDailyNote(date, trackerId)
        },

        onOpenReport: async (date: string, filePath: string, _trackerId: string) => {
          const file = this.app.vault.getFileByPath(filePath)
          if (file instanceof TFile) {
            await this.app.workspace.getLeaf('tab').openFile(file)
          }
        },

        onDeleteReport: async (_date: string, filePath: string, _trackerId: string) => {
          const file = this.app.vault.getFileByPath(filePath)
          if (file instanceof TFile) {
            await this.app.fileManager.trashFile(file)
          }
        },

        onNewProject: async (name: string, folder: string, deadline?: string) => {
          const id = `project-${Date.now()}`
          plugin.settings.projects.push({ id, name, folder, since: today, deadline })
          await ensureFolder(this.app, folder)
          await plugin.saveSettings()
          const overviewPath = `${folder}/Обзор.md`
          if (!(this.app.vault.getAbstractFileByPath(overviewPath) instanceof TFile)) {
            await this.app.vault.create(
              overviewPath,
              `# ${name}\n\n## Цель\n\n## Текущий фокус\n\n## Решения\n\n## Следующие действия\n`,
            )
          }
          await this.refresh()
        },

        onProjectUpdate: async (id: string, patch: Partial<{ since: string; deadline: string }>) => {
          const proj = plugin.settings.projects.find(p => p.id === id)
          if (!proj) return
          Object.assign(proj, patch)
          await plugin.saveSettings()
          await this.refresh()
        },

        onOpenSettings: () => plugin.openPluginSettings(),

        onOrderChange: async (main: string[]) => {
          plugin.settings.mainBlockOrder = main
          await plugin.saveSettings()
        },
      }))
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

  async createDailyNote(date: string, trackerId: string) {
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
      fallback = `---\ntype: day-summary\nstatus: done\ndate: ${date}\ncreated: ${vars.title}\ntags:\n  - life/day\n---\n\n# Итог дня — ${vars.title}\n\n## Что было важного\n\n1. \n\n## Что сделал\n\n1. \n\n## Что понял\n\n1. \n\n## Что завтра\n\n1. \n`
    } else if (trackerId === 'work') {
      folder   = this.plugin.settings.workFolder
      tplPath  = this.plugin.settings.workTemplate
      fallback = `---\ncreated: ${vars.title} ${time}\n---\n\n## План на день:\n\n1. \n\n## Итог (${vars.title}):\n\n1. \n\n## План на следующий день:\n\n1. \n`
    } else if (trackerId.startsWith('project:')) {
      const projId = trackerId.slice('project:'.length)
      const proj   = this.plugin.settings.projects.find(p => p.id === projId)
      folder   = proj?.folder ?? this.plugin.settings.projects[0]?.folder ?? ''
      tplPath  = this.plugin.settings.projectTemplate
      fallback = `---\ntype: project-report\ndate: ${date}\nproject: ${proj?.name ?? projId}\n---\n\n# ${date}\n\n## Сделано\n\n## Решения\n\n## Блокеры\n\n## Следующие действия\n`
    } else {
      return
    }

    if (!folder) return

    await ensureFolder(this.app, folder)

    const path = `${folder}/${filename}`
    let file = this.app.vault.getAbstractFileByPath(path)
    if (!(file instanceof TFile)) {
      const content = tplPath
        ? (await this.renderTemplate(tplPath, vars)) ?? fallback
        : fallback
      try {
        file = await this.app.vault.create(path, content)
      } catch {
        file = this.app.vault.getAbstractFileByPath(path)
      }
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
    document.documentElement.setAttribute(
      'data-mantine-color-scheme',
      document.body.classList.contains('theme-light') ? 'light' : 'dark',
    )

    this.registerView(VIEW_TYPE, leaf => new DashboardView(leaf, this))

    this.addRibbonIcon('gauge', 'Open Dashboard', () => this.activateView())

    this.addCommand({
      id:       'open-dashboard',
      name:     'Open Dashboard',
      callback: () => this.activateView(),
    })

    this.addCommand({
      id:       'create-personal-report-today',
      name:     'Create personal report for today',
      callback: () => this.createReportFromCommand('personal'),
    })

    this.addCommand({
      id:       'create-work-report-today',
      name:     'Create work report for today',
      callback: () => this.createReportFromCommand('work'),
    })

    this.addCommand({
      id:       'create-current-sprint',
      name:     'Create current sprint note',
      callback: () => this.createCurrentSprintFromCommand(),
    })

    this.addCommand({
      id:       'open-current-sprint-goals',
      name:     'Open current sprint goals',
      callback: () => this.openCurrentSprintGoals(),
    })

    this.addCommand({
      id:       'setup-dashboard-vault-structure',
      name:     'Setup dashboard vault structure',
      callback: async () => {
        await bootstrapDashboardVault(this.app, this.settings)
        new Notice('Dashboard: структура vault готова')
        await this.refreshOpenViews()
      },
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

  todayIso() {
    const now = new Date()
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
  }

  openPluginSettings() {
    const appWithSettings = this.app as unknown as {
      setting?: {
        open: () => void
        openTabById: (id: string) => void
      }
    }
    appWithSettings.setting?.open()
    appWithSettings.setting?.openTabById(this.manifest.id)
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

  private async refreshOpenViews() {
    for (const leaf of this.app.workspace.getLeavesOfType(VIEW_TYPE)) {
      const view = leaf.view
      if (view instanceof DashboardView) {
        await view.refresh()
      }
    }
  }

  private async createReportFromCommand(trackerId: 'personal' | 'work') {
    await this.activateView()
    const view = this.app.workspace.getLeavesOfType(VIEW_TYPE)[0]?.view
    if (view instanceof DashboardView) {
      await view.createDailyNote(this.todayIso(), trackerId)
      await view.refresh()
    }
  }

  private async createCurrentSprintFromCommand() {
    const today = this.todayIso()
    const { weekNumber, year, start, end } = isoWeekDatesFromDate(today)
    await createSprintNote(this.app, weekNumber, year, this.settings, start, end)
    new Notice(`Dashboard: спринт W${weekNumber} создан`)
    await this.refreshOpenViews()
  }

  private async openCurrentSprintGoals() {
    const today = this.todayIso()
    const { weekNumber, year, start, end } = isoWeekDatesFromDate(today)
    await createSprintNote(this.app, weekNumber, year, this.settings, start, end)
    await openSprintNote(this.app, weekNumber, year, this.settings, 'goals')
    await this.refreshOpenViews()
  }
}

function isoWeekDatesFromDate(today: string): { weekNumber: number; year: number; start: string; end: string } {
  const d = new Date(today + 'T12:00:00')
  const day = d.getDay() || 7
  d.setDate(d.getDate() + 4 - day)
  const year = d.getFullYear()
  const jan1 = new Date(year, 0, 1, 12, 0, 0)
  const weekNumber = Math.ceil(((d.getTime() - jan1.getTime()) / 86400000 + 1) / 7)
  const { start, end } = isoWeekDates(weekNumber, year)
  return { weekNumber, year, start, end }
}
