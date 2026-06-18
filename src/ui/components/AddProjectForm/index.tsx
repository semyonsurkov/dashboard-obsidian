import { useState, useRef, useMemo } from 'react'
import { Button, TextInput, Modal } from '@mantine/core'
import DatePickerPopover from '../DatePickerPopover'
import styles from './styles.module.css'

interface Props {
  onAdd:   (name: string, folder: string, deadline?: string) => Promise<void>
  folders: string[]
}

export default function AddProjectForm({ onAdd, folders }: Props) {
  const [open, setOpen]         = useState(false)
  const [name, setName]         = useState('')
  const [folder, setFolder]     = useState('')
  const [dropOpen, setDropOpen] = useState(false)
  const [deadline, setDeadline] = useState('')
  const [loading, setLoading]   = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const suggestions = useMemo(() => {
    const q = folder.trim().toLowerCase()
    return q.length === 0
      ? folders
      : folders.filter(f => f.toLowerCase().includes(q))
  }, [folder, folders])

  function reset() { setName(''); setFolder(''); setDeadline(''); setDropOpen(false) }

  async function submit() {
    if (!name.trim() || !folder.trim()) return
    setLoading(true)
    try { await onAdd(name.trim(), folder.trim(), deadline || undefined) } finally { setLoading(false) }
    reset(); setOpen(false)
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) void submit()
    if (e.key === 'Escape') setDropOpen(false)
  }

  const canSubmit = name.trim().length > 0 && folder.trim().length > 0

  return (
    <>
      <Button variant="outline" size="xs" onClick={() => setOpen(true)}>
        Добавить проект
      </Button>

      <Modal
        opened={open}
        onClose={() => { reset(); setOpen(false) }}
        title="Новый проект"
        size="sm"
        onKeyDown={handleKeyDown}
      >
        <div className={styles.body}>
          <div className={styles.field}>
            <label className={styles.field_label} htmlFor="apf_name">Название</label>
            <TextInput
              id="apf_name"
              placeholder="Мой проект"
              value={name}
              onChange={e => setName(e.target.value)}
              autoFocus
              size="sm"
            />
          </div>

          <div className={styles.field}>
            <label className={styles.field_label} htmlFor="apf_folder">Папка в Vault</label>
            <div className={styles.folder_wrap}>
              <TextInput
                ref={inputRef}
                id="apf_folder"
                placeholder="Начните вводить путь…"
                value={folder}
                onChange={e => { setFolder(e.target.value); setDropOpen(true) }}
                onFocus={() => setDropOpen(true)}
                onBlur={() => setTimeout(() => setDropOpen(false), 120)}
                autoComplete="off"
                size="sm"
              />
              {dropOpen && suggestions.length > 0 && (
                <ul className={styles.suggestions} role="listbox">
                  {suggestions.map(f => (
                    <li key={f} role="option" aria-selected={folder === f}>
                      <button
                        className={`${styles.suggestion} ${folder === f ? styles.suggestion_active : ''}`}
                        onMouseDown={e => { e.preventDefault(); setFolder(f); setDropOpen(false); inputRef.current?.blur() }}
                      >
                        {f}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>

          <div className={styles.field}>
            <span className={styles.field_label}>
              Дедлайн <span className={styles.optional}>— необязательно</span>
            </span>
            <DatePickerPopover value={deadline} onChange={setDeadline} placeholder="Без дедлайна" allowFuture />
          </div>
        </div>

        <div className={styles.footer}>
          <Button variant="subtle" size="xs" onClick={() => { reset(); setOpen(false) }}>
            Отмена
          </Button>
          <Button size="xs" onClick={submit} disabled={!canSubmit || loading}>
            {loading ? 'Создаём…' : 'Создать проект'}
          </Button>
        </div>
      </Modal>
    </>
  )
}
