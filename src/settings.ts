import { App, AbstractInputSuggest, PluginSettingTab, Setting, TFile } from 'obsidian'
import type DashboardPlugin from './main'
import type { ProjectConfig } from './types'

// ─── File suggest (autocomplete for template paths) ────────────────────────────

class FileSuggest extends AbstractInputSuggest<TFile> {
  private el: HTMLInputElement

  constructor(app: App, inputEl: HTMLInputElement) {
    super(app, inputEl)
    this.el = inputEl
  }

  getSuggestions(query: string): TFile[] {
    const lower = query.toLowerCase()
    return this.app.vault.getMarkdownFiles()
      .filter(f => f.path.toLowerCase().includes(lower))
      .sort((a, b) => a.path.localeCompare(b.path))
      .slice(0, 20)
  }

  renderSuggestion(file: TFile, el: HTMLElement): void {
    el.setText(file.path)
  }

  selectSuggestion(file: TFile): void {
    this.el.value = file.path
    this.el.dispatchEvent(new Event('input'))
    this.close()
  }
}

// ─── Types ─────────────────────────────────────────────────────────────────────

export interface DashboardSettings {
  personalFolder:   string
  workFolder:       string
  workWeekendsOff:  boolean
  personalTemplate: string
  workTemplate:     string

  projects:         ProjectConfig[]
  projectTemplate:  string

  weeklyFolder:     string
  sprintTemplate:   string

  mainBlockOrder:   string[]
}

export const DEFAULT_SETTINGS: DashboardSettings = {
  personalFolder:   '1 ⚙️ Base/daily',
  workFolder:       '2 💻 Work/Отчет за каждый день',
  workWeekendsOff:  true,
  personalTemplate: '',
  workTemplate:     '',

  projects:         [{ id: 'verba', name: 'Verba', folder: '2 💻 Work/Verba', since: '2026-01-01', deadline: '2026-09-01' }],
  projectTemplate:  '',

  weeklyFolder:     '1 ⚙️ Base/periodic/weekly',
  sprintTemplate:   '',

  mainBlockOrder:   ['tracker', 'history'],
}

// ─── Setting tab ───────────────────────────────────────────────────────────────

export class DashboardSettingTab extends PluginSettingTab {
  constructor(app: App, private plugin: DashboardPlugin) {
    super(app, plugin)
  }

  display(): void {
    const { containerEl } = this
    containerEl.empty()
    containerEl.createEl('h2', { text: 'Dashboard' })

    // ── Трекеры ──────────────────────────────────────────────────────────────

    containerEl.createEl('h3', { text: 'Трекеры' })

    new Setting(containerEl)
      .setName('Личный дневник — папка')
      .setDesc('Файлы формата DD-MM-YYYY.md')
      .addText(t => t
        .setPlaceholder('1 ⚙️ Base/daily')
        .setValue(this.plugin.settings.personalFolder)
        .onChange(async v => { this.plugin.settings.personalFolder = v; await this.plugin.saveSettings() }),
      )

    new Setting(containerEl)
      .setName('Личный дневник — шаблон')
      .setDesc('Переменные: {{date}}, {{title}}, {{time}}')
      .addText(t => {
        t.setPlaceholder('templates/Daily.md')
          .setValue(this.plugin.settings.personalTemplate)
          .onChange(async v => { this.plugin.settings.personalTemplate = v.trim(); await this.plugin.saveSettings() })
        new FileSuggest(this.app, t.inputEl)
        return t
      })

    new Setting(containerEl)
      .setName('Рабочий дневник — папка')
      .setDesc('Файлы формата DD-MM-YYYY.md')
      .addText(t => t
        .setPlaceholder('2 💻 Work/Отчет за каждый день')
        .setValue(this.plugin.settings.workFolder)
        .onChange(async v => { this.plugin.settings.workFolder = v; await this.plugin.saveSettings() }),
      )

    new Setting(containerEl)
      .setName('Рабочий дневник — шаблон')
      .setDesc('Переменные: {{date}}, {{title}}, {{time}}')
      .addText(t => {
        t.setPlaceholder('templates/WorkReport.md')
          .setValue(this.plugin.settings.workTemplate)
          .onChange(async v => { this.plugin.settings.workTemplate = v.trim(); await this.plugin.saveSettings() })
        new FileSuggest(this.app, t.inputEl)
        return t
      })

    new Setting(containerEl)
      .setName('Рабочий трекер: выходные выключены')
      .addToggle(t => t
        .setValue(this.plugin.settings.workWeekendsOff)
        .onChange(async v => { this.plugin.settings.workWeekendsOff = v; await this.plugin.saveSettings() }),
      )

    // ── Спринты ───────────────────────────────────────────────────────────────

    containerEl.createEl('h3', { text: 'Спринты' })

    new Setting(containerEl)
      .setName('Папка недельных заметок')
      .setDesc('Формат: YYYY-WNN.md')
      .addText(t => t
        .setPlaceholder('1 ⚙️ Base/periodic/weekly')
        .setValue(this.plugin.settings.weeklyFolder)
        .onChange(async v => { this.plugin.settings.weeklyFolder = v; await this.plugin.saveSettings() }),
      )

    new Setting(containerEl)
      .setName('Спринт — шаблон')
      .setDesc('Переменные: {{week}}, {{year}}, {{date_start}}, {{date_end}}')
      .addText(t => {
        t.setPlaceholder('templates/Sprint.md')
          .setValue(this.plugin.settings.sprintTemplate)
          .onChange(async v => { this.plugin.settings.sprintTemplate = v.trim(); await this.plugin.saveSettings() })
        new FileSuggest(this.app, t.inputEl)
        return t
      })

    // ── Проекты ───────────────────────────────────────────────────────────────

    containerEl.createEl('h3', { text: 'Проекты' })

    new Setting(containerEl)
      .setName('Шаблон отчёта по проекту')
      .setDesc('Переменные: {{date}}, {{title}}, {{time}}')
      .addText(t => {
        t.setPlaceholder('templates/ProjectReport.md')
          .setValue(this.plugin.settings.projectTemplate)
          .onChange(async v => { this.plugin.settings.projectTemplate = v.trim(); await this.plugin.saveSettings() })
        new FileSuggest(this.app, t.inputEl)
        return t
      })

  }
}
