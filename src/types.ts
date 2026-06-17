import type React from 'react'

export interface HistoryDay {
  date:      string   // ISO YYYY-MM-DD
  reported:  boolean
  text:      string
  filePath?: string   // vault-relative path to the note
}

export interface TrackerStats {
  streak:           number
  bestStreak:       number
  total:            number
  attendance:       number
  lastReportedDate: string | null
  daysSinceLast:    number | null
}

export type TrackerId = 'personal' | 'work'
export type MainTab   = TrackerId | 'projects'
export type RangeMode = 'sprint' | 'all'
export type Preset    = 'week' | 'month' | 'all'
export type BlockId   = 'tracker' | 'history'

export interface Tracker {
  id:          TrackerId
  label:       string
  icon:        React.ElementType
  days:        HistoryDay[]
  weekendsOff: boolean
  since:       string   // ISO YYYY-MM-DD
}

export interface Project {
  id:       string
  name:     string
  folder:   string
  since:    string     // ISO YYYY-MM-DD
  days:     HistoryDay[]
  deadline?: string    // ISO YYYY-MM-DD, optional
}

export interface ProjectConfig {
  id:        string
  name:      string
  folder:    string
  since:     string
  deadline?: string
  template?: string
}

export interface Sprint {
  weekNumber:    number
  year:          number
  start:         string   // ISO YYYY-MM-DD (Monday)
  end:           string   // ISO YYYY-MM-DD (Sunday)
  goalsPersonal: string[]
  goalsWork:     string[]
  summary?:      string
  retro?:        string
  created:       boolean
}
