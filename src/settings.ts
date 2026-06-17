import { App, PluginSettingTab, Setting } from 'obsidian'
import type DashboardPlugin from './main'

export interface DashboardSettings {
  personalFolder:  string
  workFolder:      string
  workWeekendsOff: boolean

  verbaFolder:     string
  verbaSince:      string
  verbaDeadline:   string

  weeklyFolder:    string

  goFolder:        string
  englishFolder:   string

  mainBlockOrder:  string[]
  sideBlockOrder:  string[]
}

export const DEFAULT_SETTINGS: DashboardSettings = {
  personalFolder:  '1 ⚙️ Base/daily',
  workFolder:      '2 💻 Work/Отчет за каждый день',
  workWeekendsOff: true,

  verbaFolder:     '2 💻 Work/Verba',
  verbaSince:      '2026-01-01',
  verbaDeadline:   '2026-09-01',

  weeklyFolder:    '1 ⚙️ Base/periodic/weekly',

  goFolder:        '1 ⚙️ Base/GO',
  englishFolder:   '1 ⚙️ Base/English',

  mainBlockOrder:  ['tracker', 'history'],
  sideBlockOrder:  ['go', 'english'],
}

export class DashboardSettingTab extends PluginSettingTab {
  constructor(app: App, private plugin: DashboardPlugin) {
    super(app, plugin)
  }

  display(): void {
    const { containerEl } = this
    containerEl.empty()
    containerEl.createEl('h2', { text: 'Dashboard — Настройки' })

    containerEl.createEl('h3', { text: 'Трекеры' })

    new Setting(containerEl)
      .setName('Личный дневник (папка)')
      .setDesc('Заметки формата DD-MM-YYYY.md')
      .addText(t => t
        .setPlaceholder('1 ⚙️ Base/daily')
        .setValue(this.plugin.settings.personalFolder)
        .onChange(async v => { this.plugin.settings.personalFolder = v; await this.plugin.saveSettings() }),
      )

    new Setting(containerEl)
      .setName('Рабочий дневник (папка)')
      .setDesc('Заметки формата DD-MM-YYYY.md')
      .addText(t => t
        .setPlaceholder('2 💻 Work/Отчет за каждый день')
        .setValue(this.plugin.settings.workFolder)
        .onChange(async v => { this.plugin.settings.workFolder = v; await this.plugin.saveSettings() }),
      )

    new Setting(containerEl)
      .setName('Рабочий трекер: выходные выключены')
      .addToggle(t => t
        .setValue(this.plugin.settings.workWeekendsOff)
        .onChange(async v => { this.plugin.settings.workWeekendsOff = v; await this.plugin.saveSettings() }),
      )

    containerEl.createEl('h3', { text: 'Спринты' })

    new Setting(containerEl)
      .setName('Папка недельных заметок')
      .setDesc('Куда создаются заметки спринта (формат YYYY-WNN.md)')
      .addText(t => t
        .setPlaceholder('1 ⚙️ Base/periodic/weekly')
        .setValue(this.plugin.settings.weeklyFolder)
        .onChange(async v => { this.plugin.settings.weeklyFolder = v; await this.plugin.saveSettings() }),
      )

    containerEl.createEl('h3', { text: 'Проект Verba' })

    new Setting(containerEl)
      .setName('Verba (папка)')
      .addText(t => t
        .setPlaceholder('2 💻 Work/Verba')
        .setValue(this.plugin.settings.verbaFolder)
        .onChange(async v => { this.plugin.settings.verbaFolder = v; await this.plugin.saveSettings() }),
      )

    new Setting(containerEl)
      .setName('Verba: начало проекта (ISO)')
      .addText(t => t
        .setPlaceholder('2026-01-01')
        .setValue(this.plugin.settings.verbaSince)
        .onChange(async v => { this.plugin.settings.verbaSince = v; await this.plugin.saveSettings() }),
      )

    new Setting(containerEl)
      .setName('Verba: дедлайн (ISO)')
      .addText(t => t
        .setPlaceholder('2026-09-01')
        .setValue(this.plugin.settings.verbaDeadline)
        .onChange(async v => { this.plugin.settings.verbaDeadline = v; await this.plugin.saveSettings() }),
      )

    containerEl.createEl('h3', { text: 'Быстрые заметки' })

    new Setting(containerEl)
      .setName('Go (папка)')
      .addText(t => t
        .setPlaceholder('1 ⚙️ Base/GO')
        .setValue(this.plugin.settings.goFolder)
        .onChange(async v => { this.plugin.settings.goFolder = v; await this.plugin.saveSettings() }),
      )

    new Setting(containerEl)
      .setName('English (папка)')
      .addText(t => t
        .setPlaceholder('1 ⚙️ Base/English')
        .setValue(this.plugin.settings.englishFolder)
        .onChange(async v => { this.plugin.settings.englishFolder = v; await this.plugin.saveSettings() }),
      )
  }
}
