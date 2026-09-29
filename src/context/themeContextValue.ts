import { createContext, useContext } from 'react'
import type { ColorMode } from '../theme/theme'

export interface ThemeContextValue {
  mode: ColorMode
  setMode: (mode: ColorMode) => void
  toggleMode: () => void
}

export const ThemeContext = createContext<ThemeContextValue | null>(null)

export function useThemeMode(): ThemeContextValue {
  const ctx = useContext(ThemeContext)
  if (ctx === null) {
    throw new Error('useThemeMode must be used inside a ThemeProvider')
  }
  return ctx
}
