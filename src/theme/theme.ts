import { createTheme, type Theme } from '@mui/material/styles'

/**
 * Surfaces are neutral greys. Blue is the only chroma in the theme, reserved
 * for primary actions and active navigation state. No secondary hue: a second
 * accent colour competes with the first and reads as noise on a dense grid.
 */
const palette = {
  light: {
    mode: 'light' as const,
    primary: { main: '#1d6fe0', dark: '#1554ac', light: '#5b95ef', contrastText: '#ffffff' },
    background: { default: '#f5f6f8', paper: '#ffffff' },
    divider: 'rgba(0, 0, 0, 0.08)',
  },
  dark: {
    mode: 'dark' as const,
    primary: { main: '#64a0f5', dark: '#8fbcf8', light: '#3a7fd4', contrastText: '#0b1220' },
    background: { default: '#101418', paper: '#171c22' },
    divider: 'rgba(255, 255, 255, 0.08)',
  },
} as const

export type ColorMode = 'light' | 'dark'

export function buildAppTheme(mode: ColorMode): Theme {
  const tokens = palette[mode]
  const isDark = mode === 'dark'

  return createTheme({
    cssVariables: true,
    palette: {
      mode: tokens.mode,
      primary: tokens.primary,
      background: tokens.background,
      divider: tokens.divider,
    },
    shape: { borderRadius: 10 },
    typography: {
      fontFamily: [
        'system-ui',
        '-apple-system',
        'Segoe UI',
        'Roboto',
        'Helvetica',
        'Arial',
        'sans-serif',
      ].join(','),
      h4: { fontWeight: 700, letterSpacing: '-0.02em' },
      h5: { fontWeight: 700, letterSpacing: '-0.02em' },
      h6: { fontWeight: 600 },
      button: { textTransform: 'none' as const },
    },
    components: {
      MuiAppBar: {
        defaultProps: { elevation: 0, color: 'default' },
        styleOverrides: {
          root: { backgroundImage: 'none', borderBottom: `1px solid ${tokens.divider}` },
        },
      },
      MuiCard: {
        defaultProps: { elevation: 0 },
        styleOverrides: {
          root: { backgroundImage: 'none', border: `1px solid ${tokens.divider}` },
        },
      },
      MuiCardMedia: {
        styleOverrides: {
          root: { backgroundColor: isDark ? '#232a33' : '#e8eaee' },
        },
      },
      MuiButton: {
        defaultProps: { disableElevation: true },
        styleOverrides: {
          root: { fontWeight: 600 },
        },
      },
      MuiChip: {
        styleOverrides: {
          root: { fontWeight: 600 },
        },
      },
    },
  })
}
