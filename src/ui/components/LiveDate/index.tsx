import { useState, useEffect } from 'react'
import styles from './styles.module.css'

const MONTHS_GEN = ['января','февраля','марта','апреля','мая','июня','июля','августа','сентября','октября','ноября','декабря']
const DOW_FULL   = ['Воскресенье','Понедельник','Вторник','Среда','Четверг','Пятница','Суббота']

export default function LiveDate() {
  const [now, setNow] = useState(new Date())

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1_000)
    return () => clearInterval(id)
  }, [])

  const hour     = now.getHours()
  const greeting = hour < 12 ? 'Доброе утро' : hour < 18 ? 'Добрый день' : 'Добрый вечер'
  const timeStr  = `${String(hour).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}`

  return (
    <div className={styles.root}>
      <div className={styles.top_row}>
        <span className={styles.greeting}>{greeting}</span>
        <span className={styles.time}>{timeStr}</span>
      </div>
      <span className={styles.date}>
        {DOW_FULL[now.getDay()]}, {now.getDate()} {MONTHS_GEN[now.getMonth()]} {now.getFullYear()}
      </span>
    </div>
  )
}
