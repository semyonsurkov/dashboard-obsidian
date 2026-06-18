import type { ReactNode } from 'react'
import { MantineProvider } from '@mantine/core'
import { DatesProvider } from '@mantine/dates'
import { Notifications } from '@mantine/notifications'
import { theme } from './theme'

import '@mantine/core/styles.css'
import '@mantine/dates/styles.css'
import '@mantine/notifications/styles.css'
import './styles/tokens.css'

import 'dayjs/locale/ru'

interface Props {
  children:     ReactNode
  colorScheme?: 'light' | 'dark'
}

export function Providers({ children, colorScheme = 'dark' }: Props) {
  return (
    <MantineProvider
      theme={theme}
      forceColorScheme={colorScheme}
    >
      <DatesProvider settings={{ locale: 'ru', firstDayOfWeek: 1, weekendDays: [] }}>
        <Notifications position="bottom-right" />
        {children}
      </DatesProvider>
    </MantineProvider>
  )
}
