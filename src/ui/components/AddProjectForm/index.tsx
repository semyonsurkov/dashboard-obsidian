import { useState } from 'react'
import { Plus, FolderOpen, ChevronsUpDown, Check } from 'lucide-react'
import DatePickerPopover from '../DatePickerPopover'
import { Button } from '@/ui/components/ui/button'
import { Popover, PopoverContent, PopoverTrigger } from '@/ui/components/ui/popover'
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/ui/components/ui/command'
import { cn } from '@/lib/utils'
import styles from './styles.module.css'

interface Props {
  onAdd:   (name: string, folder: string, deadline?: string) => void
  folders: string[]
}

export default function AddProjectForm({ onAdd, folders }: Props) {
  const [open, setOpen]         = useState(false)
  const [name, setName]         = useState('')
  const [folder, setFolder]     = useState('')
  const [folderOpen, setFolderOpen] = useState(false)
  const [deadline, setDeadline] = useState('')

  function submit() {
    if (!name.trim() || !folder.trim()) return
    onAdd(name.trim(), folder.trim(), deadline || undefined)
    setName(''); setFolder(''); setDeadline(''); setOpen(false)
  }

  function cancel() {
    setName(''); setFolder(''); setDeadline(''); setOpen(false)
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

  const canSubmit = name.trim().length > 0 && folder.trim().length > 0

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
        <label className={styles.label}>Папка в Vault</label>
        <Popover open={folderOpen} onOpenChange={setFolderOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              role="combobox"
              aria-expanded={folderOpen}
              className="tw-w-full tw-justify-between tw-font-normal"
            >
              <FolderOpen size={13} className="tw-shrink-0 tw-opacity-50" />
              <span className="tw-flex-1 tw-text-left tw-truncate">
                {folder || 'Начните вводить путь…'}
              </span>
              <ChevronsUpDown size={11} className="tw-shrink-0 tw-opacity-50" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="tw-w-[--radix-popover-trigger-width] tw-p-0" align="start">
            <Command>
              <CommandInput
                placeholder="Поиск папки…"
                value={folder}
                onValueChange={setFolder}
              />
              <CommandList>
                <CommandEmpty>Папка не найдена</CommandEmpty>
                <CommandGroup>
                  {folders.map(f => (
                    <CommandItem
                      key={f}
                      value={f}
                      onSelect={() => { setFolder(f); setFolderOpen(false) }}
                    >
                      <Check className={cn('tw-mr-2 tw-h-4 tw-w-4', folder === f ? 'tw-opacity-100' : 'tw-opacity-0')} />
                      {f}
                    </CommandItem>
                  ))}
                </CommandGroup>
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>
      </div>

      <div className={styles.field}>
        <span className={styles.label}>
          Дедлайн <span className={styles.optional}>— необязательно</span>
        </span>
        <DatePickerPopover value={deadline} onChange={setDeadline} placeholder="Без дедлайна" allowFuture />
      </div>

      <div className={styles.actions}>
        <Button variant="ghost" size="sm" onClick={cancel}>Отмена</Button>
        <Button size="sm" onClick={submit} disabled={!canSubmit}>Создать проект</Button>
      </div>
    </div>
  )
}
