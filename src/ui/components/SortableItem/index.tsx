import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { GripVertical } from 'lucide-react'
import type { ReactNode } from 'react'
import styles from './styles.module.css'

interface Props {
  id:       string
  editMode: boolean
  children: ReactNode
}

export default function SortableItem({ id, editMode, children }: Props) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id })
  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={`${styles.root} ${isDragging ? styles.root_dragging : ''}`}
    >
      {editMode && (
        <div
          className={styles.handle}
          {...attributes}
          {...listeners}
          aria-label="Перетащить блок"
        >
          <GripVertical size={15} aria-hidden />
        </div>
      )}
      {children}
    </div>
  )
}
