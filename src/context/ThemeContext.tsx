import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import CssBaseline from '@mui/material/CssBaseline'
import { ThemeProvider } from '@mui/material/styles'
import { buildAppTheme, type ColorMode } from '../theme/theme'
import { readStoredValue, STORAGE_KEYS, writeStoredValue } from '../utils/storage'
import { ThemeContext, type ThemeContextValue } from './themeContextValue'

function systemPrefersDark(): boolean {
  if (typeof window === 'undefined' || !window.matchMedia) return false
  return window.matchMedia('(prefers-color-scheme: dark)').matches
}

function initialMode(): ColorMode {
  const stored = readStoredValue<ColorMode | null>(STORAGE_KEYS.theme, null)
  if (stored === 'light' || stored === 'dark') return stored
  return systemPrefersDark() ? 'dark' : 'light'
}

export function AppThemeProvider({ children }: { children: ReactNode }) {
  const [mode, setModeState] = useState<ColorMode>(initialMode)

  const setMode = useCallback((next: ColorMode) => {
    setModeState(next)
    writeStoredValue(STORAGE_KEYS.theme, next)
  }, [])

  const toggleMode = useCallback(() => {
    setModeState((current) => {
      const next: ColorMode = current === 'light' ? 'dark' : 'light'
      writeStoredValue(STORAGE_KEYS.theme, next)
      return next
    })
  }, [])

  useEffect(() => {
    const stored = readStoredValue<ColorMode | null>(STORAGE_KEYS.theme, null)
    if (stored !== null) return

    const query = window.matchMedia('(prefers-color-scheme: dark)')
    const onChange = (event: MediaQueryListEvent) => {
      setModeState(event.matches ? 'dark' : 'light')
    }
    query.addEventListener('change', onChange)
    return () => query.removeEventListener('change', onChange)
  }, [])

  useEffect(() => {
    document.documentElement.style.colorScheme = mode
  }, [mode])

  const theme = useMemo(() => buildAppTheme(mode), [mode])
  const value = useMemo<ThemeContextValue>(
    () => ({ mode, setMode, toggleMode }),
    [mode, setMode, toggleMode],
  )

  return (
    <ThemeContext.Provider value={value}>
      <ThemeProvider theme={theme}>
        <CssBaseline enableColorScheme />
        {children}
      </ThemeProvider>
    </ThemeContext.Provider>
  )
}
