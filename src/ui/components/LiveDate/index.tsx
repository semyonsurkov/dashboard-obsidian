import styles from './styles.module.css'

const MONTHS_GEN = ['января','февраля','марта','апреля','мая','июня','июля','августа','сентября','октября','ноября','декабря']
const DOW_FULL   = ['Воскресенье','Понедельник','Вторник','Среда','Четверг','Пятница','Суббота']

export default function LiveDate() {
  const now      = new Date()
  const hour     = now.getHours()
  const greeting = hour < 12 ? 'Доброе утро' : hour < 18 ? 'Добрый день' : 'Добрый вечер'

  return (
    <div className={styles.live_date}>
      <span className={styles.greeting}>{greeting}</span>
      <span className={styles.dt}>
        {DOW_FULL[now.getDay()]}, {now.getDate()} {MONTHS_GEN[now.getMonth()]} {now.getFullYear()}
      </span>
    </div>
  )
}
