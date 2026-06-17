import { Plus, NotebookPen } from 'lucide-react'
import type React from 'react'
import styles from './styles.module.css'

interface Props {
  title:       string
  icon:        React.ElementType
  iconClass:   string          // e.g. 'icon_go' or 'icon_english'
  notes:       string[]
  hubNote:     string
  onNoteClick: (name: string) => void
  onNewNote:   () => void
  onToast:     (msg: string) => void
}

export default function QuickBlock({ title, icon: Icon, iconClass, notes, hubNote, onNoteClick, onNewNote, onToast }: Props) {
  return (
    <div className={`db_card ${styles.card}`}>
      <div className={styles.header}>
        <Icon size={16} aria-hidden className={iconClass} />
        <button
          className={`${styles.hub_link} ${iconClass}`}
          onClick={() => onToast(`Открываем главную заметку: ${hubNote}`)}
          aria-label={`Открыть главную заметку ${title}`}
        >
          {title}
        </button>
        <div className={styles.actions}>
          <button
            className="btn btn--ghost btn--sm"
            onClick={() => onNewNote()}
            aria-label={`Новая заметка в ${title}`}
          >
            <Plus size={11} aria-hidden /> Новая заметка
          </button>
        </div>
      </div>

      <div className={styles.note_list} role="list">
        {notes.map(n => (
          <div
            key={n}
            className={styles.note_row}
            role="listitem"
            tabIndex={0}
            onClick={() => onNoteClick(n)}
            onKeyDown={e => e.key === 'Enter' && onNoteClick(n)}
          >
            <NotebookPen size={11} aria-hidden className={styles.note_icon} />
            <span>{n}</span>
          </div>
        ))}
        {notes.length === 0 && (
          <p className={styles.empty}>Заметок нет</p>
        )}
      </div>
    </div>
  )
}
