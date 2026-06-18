import { createTheme, type MantineColorsTuple } from '@mantine/core'

// Obsidian-native palette: each slot uses an Obsidian CSS variable with a
// slate-dark fallback so the browser preview (port 3000) looks unchanged.
const dark: MantineColorsTuple = [
  'var(--text-normal,        #dcddde)', // dark[0] — primary text
  'var(--text-normal,        #c8c9ca)', // dark[1]
  'var(--text-muted,         #999999)', // dark[2] — muted text
  'var(--text-faint,         #666666)', // dark[3] — faint text
  'var(--background-modifier-border,       #404040)', // dark[4] — borders
  'var(--background-modifier-border-hover, #333333)', // dark[5] — strong border / hover
  'var(--background-secondary, #2a2a2a)', // dark[6] — card / secondary bg
  'var(--background-primary,   #1e1e1e)', // dark[7] — panel / body bg
  'var(--background-primary,   #191919)', // dark[8]
  'var(--background-primary,   #141414)', // dark[9]
]

// Accent blue → Obsidian interactive accent (any theme colour)
const blue: MantineColorsTuple = [
  '#e8f0ff',
  '#ccdaff',
  '#a0b8ff',
  'var(--interactive-accent, #7da4ff)',
  'var(--interactive-accent, #6ea0ff)',
  'var(--interactive-accent, #4f8cff)',       // blue[5] — primary filled
  'var(--interactive-accent-hover, #3a7aff)', // blue[6]
  'var(--interactive-accent-hover, #2a68ee)',
  '#1a55dd',
  '#0d44cc',
]

const green: MantineColorsTuple = [
  '#f0fdf4', '#dcfce7', '#bbf7d0', '#86efac',
  '#4ade80', '#22c55e', '#16a34a', '#15803d',
  '#166534', '#14532d',
]

const amber: MantineColorsTuple = [
  '#fffbeb', '#fef3c7', '#fde68a', '#fcd34d',
  '#fbbf24', '#f59e0b', '#d97706', '#b45309',
  '#92400e', '#78350f',
]

export const theme = createTheme({
  colors: { dark, blue, green, amber },
  primaryColor: 'blue',
  primaryShade: { light: 6, dark: 5 },
  defaultRadius: 'md',
  fontFamily: 'var(--font-interface, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif)',
  fontSizes: {
    xs: '11px',
    sm: '13px',
    md: '14px',
    lg: '16px',
    xl: '18px',
  },
  lineHeights: { xs: '1.4', sm: '1.45', md: '1.5', lg: '1.5', xl: '1.5' },
  components: {
    Card:   { defaultProps: { radius: 'md', shadow: undefined } },
    Paper:  { defaultProps: { radius: 'md' } },
    Modal:  { defaultProps: { radius: 'lg', centered: true } },
    Button: { defaultProps: { radius: 'md' } },
    Badge:  { defaultProps: { radius: 'xl', size: 'xs' } },
  },
})
