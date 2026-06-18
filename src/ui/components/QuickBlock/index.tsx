import { NotebookPen } from 'lucide-react'
import type React from 'react'
import { Card, Button, ActionIcon } from '@mantine/core'
import styles from './styles.module.css'

interface Props {
  title:       string
  icon:        React.ElementType
  iconClass:   string
  notes:       string[]
  onHubClick:  () => void
  onNoteClick: (name: string) => void
  onNewNote:   () => void
}

export default function QuickBlock({ title, icon: Icon, iconClass, notes, onHubClick, onNoteClick, onNewNote }: Props) {
  return (
    <Card withBorder p={0} radius="md">
      <div className={styles.header}>
        <Icon size={16} aria-hidden className={iconClass} />
        <button
          className={styles.title_btn}
          onClick={onHubClick}
          aria-label={`Открыть главную заметку ${title}`}
        >
          {title}
        </button>
        <Button
          variant="subtle"
          size="xs"
          onClick={() => onNewNote()}
          aria-label={`Новая заметка в ${title}`}
        >
          Новая заметка
        </Button>
      </div>

      <div className={styles.list} role="list">
        {notes.map(n => (
          <Button
            key={n}
            variant="subtle"
            size="xs"
            fullWidth
            justify="left"
            leftSection={<NotebookPen size={11} aria-hidden style={{ flexShrink: 0 }} />}
            role="listitem"
            onClick={() => onNoteClick(n)}
            styles={{ inner: { overflow: 'hidden' }, label: { overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', minWidth: 0 } }}
          >
            {n}
          </Button>
        ))}
        {notes.length === 0 && (
          <p className={styles.empty}>Заметок нет</p>
        )}
      </div>
    </Card>
  )
}
