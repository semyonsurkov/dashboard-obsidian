import { useState, useRef, useCallback } from 'react'
import { Plus, FolderOpen } from 'lucide-react'
import DatePickerPopover from '../DatePickerPopover'
import { Button } from '@/ui/components/ui/button'
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
    ? folders.filter(f => f.toLowerCase().includes(folderSearch.toLowerCase())).slice(0, 8)
    : folders.slice(0, 8)

  const selectFolder = useCallback((path: string) => {
    setFolderSearch(path)
    setShowList(false)
  }, [])

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

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) submit()
    if (e.key === 'Escape') cancel()
  }

  if (!open) {
    return (
      <Button variant="ghost" size="sm" className="tw-border tw-border-dashed tw-border-border" onClick={() => setOpen(true)}>
        <Plus size={12} aria-hidden /> Добавить проект
      </Button>
    )
  }

  const canSubmit = name.trim().length > 0 && folderSearch.trim().length > 0

  return (
    <div className={styles.form} onKeyDown={handleKeyDown}>
      <p className={styles.form_title}>Новый проект</p>

      <div className={styles.field}>
        <label className={styles.label} htmlFor="apf_name">Название</label>
        <input
          id="apf_name"
          className={`db_input ${styles.input}`}
          placeholder="Мой проект"
          value={name}
          onChange={e => setName(e.target.value)}
          autoFocus
        />
      </div>

      <div className={styles.field}>
        <label className={styles.label} htmlFor="apf_folder">Папка в Vault</label>
        <div className={styles.folder_wrap}>
          <FolderOpen size={13} className={styles.folder_icon} aria-hidden />
          <input
            id="apf_folder"
            className={`db_input ${styles.input} ${styles.folder_input}`}
            placeholder="Начните вводить путь…"
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
      </div>

      <div className={styles.field}>
        <span className={styles.label}>
          Дедлайн <span className={styles.optional}>— необязательно</span>
        </span>
        <DatePickerPopover
          value={deadline}
          onChange={setDeadline}
          placeholder="Без дедлайна"
          allowFuture
        />
      </div>

      <div className={styles.actions}>
        <Button variant="ghost" size="sm" onClick={cancel}>Отмена</Button>
        <Button
          size="sm"
          onClick={submit}
          disabled={!canSubmit}
        >
          Создать проект
        </Button>
      </div>
    </div>
  )
}
