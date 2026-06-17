import { useState, useRef } from 'react'
import { Plus, FolderOpen } from 'lucide-react'
import DatePickerPopover from '../DatePickerPopover'
import styles from './styles.module.css'

interface Props {
  onAdd:   (name: string, folder: string, deadline?: string) => void
  folders: string[]
}

export default function AddProjectForm({ onAdd, folders }: Props) {
  const [open, setOpen]               = useState(false)
  const [name, setName]               = useState('')
  const [folderSearch, setFolderSearch] = useState('')
  const [showList, setShowList]       = useState(false)
  const [deadline, setDeadline]       = useState('')
  const blurTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const filtered = folderSearch
    ? folders.filter(f => f.toLowerCase().includes(folderSearch.toLowerCase())).slice(0, 10)
    : folders.slice(0, 10)

  function selectFolder(path: string) {
    setFolderSearch(path)
    setShowList(false)
  }

  function handleFolderFocus() {
    if (blurTimer.current) clearTimeout(blurTimer.current)
    setShowList(true)
  }

  function handleFolderBlur() {
    blurTimer.current = setTimeout(() => setShowList(false), 150)
  }

  function submit() {
    if (!name.trim() || !folderSearch.trim()) return
    onAdd(name.trim(), folderSearch.trim(), deadline || undefined)
    setName(''); setFolderSearch(''); setDeadline(''); setOpen(false)
  }

  function cancel() {
    setName(''); setFolderSearch(''); setDeadline(''); setOpen(false)
  }

  if (!open) {
    return (
      <button className="btn btn--ghost btn--dashed btn--sm" onClick={() => setOpen(true)}>
        <Plus size={12} aria-hidden /> Добавить проект
      </button>
    )
  }

  return (
    <div className={styles.form}>
      <input
        className="db_input"
        placeholder="Название проекта"
        value={name}
        onChange={e => setName(e.target.value)}
        autoFocus
      />
      <div className={styles.folder_wrap}>
        <FolderOpen size={13} className={styles.folder_icon} aria-hidden />
        <input
          className="db_input"
          style={{ paddingLeft: 'calc(var(--space-2) + 13px + var(--space-2))' }}
          placeholder="Поиск папки в vault…"
          value={folderSearch}
          onChange={e => { setFolderSearch(e.target.value); setShowList(true) }}
          onFocus={handleFolderFocus}
          onBlur={handleFolderBlur}
          autoComplete="off"
        />
        {showList && filtered.length > 0 && (
          <div className={styles.folder_list}>
            {filtered.map(f => (
              <button
                key={f}
                className={styles.folder_opt}
                onMouseDown={e => { e.preventDefault(); selectFolder(f) }}
              >
                {f}
              </button>
            ))}
          </div>
        )}
      </div>
      <div className={styles.deadline_row}>
        <DatePickerPopover
          value={deadline}
          onChange={setDeadline}
          label="Дедлайн:"
          placeholder="Без дедлайна"
          allowFuture
        />
      </div>
      <div className={styles.actions}>
        <button className="btn btn--ghost btn--sm" onClick={cancel}>Отмена</button>
        <button
          className="btn btn--primary btn--sm"
          onClick={submit}
          disabled={!name.trim() || !folderSearch.trim()}
        >
          Создать
        </button>
      </div>
    </div>
  )
}
