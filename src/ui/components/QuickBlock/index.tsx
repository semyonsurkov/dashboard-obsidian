import { NotebookPen } from 'lucide-react'
import type React from 'react'
import { Button } from '@/ui/components/ui/button'
import styles from './styles.module.css'

interface Props {
  title:       string
  icon:        React.ElementType
  iconClass:   string
  notes:       string[]
  hubNote:     string
  onHubClick:  () => void
  onNoteClick: (name: string) => void
  onNewNote:   () => void
}

export default function QuickBlock({ title, icon: Icon, iconClass, notes, onHubClick, onNoteClick, onNewNote }: Props) {
  return (
    <div className={`db_card ${styles.card}`}>
      <div className={styles.header}>
        <Icon size={16} aria-hidden className={iconClass} />
        <button
          className={`${styles.hub_link} ${iconClass}`}
          onClick={onHubClick}
          aria-label={`Открыть главную заметку ${title}`}
        >
          {title}
        </button>
        <div className={styles.actions}>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onNewNote()}
            aria-label={`Новая заметка в ${title}`}
          >
            Новая заметка
          </Button>
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
