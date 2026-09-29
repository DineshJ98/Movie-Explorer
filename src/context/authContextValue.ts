import { createContext, useContext } from 'react'
import type { TmdbAccount } from '../types/tmdbAuth'

export type AuthStatus = 'loading' | 'authenticated' | 'anonymous'

export interface AuthContextValue {
  /**
   * Null whenever `status` is not `'authenticated'`.
   *
   * Only the fields the UI needs are carried. The `session_id` is exposed
   * separately because the favourites API requires it, and Phase 6 is its only
   * intended consumer.
   */
  account: TmdbAccount | null
  sessionId: string | null
  status: AuthStatus
  /** Human-readable failure from the most recent login attempt, if any. */
  error: string | null
  /** Starts the TMDB approval redirect. Returns nothing; the page navigates away. */
  beginLogin: () => void
  /** Exchanges an approved token for a session. Resolves true on success. */
  completeLogin: (requestToken: string) => Promise<boolean>
  logout: () => Promise<void>
  clearError: () => void
}

export const AuthContext = createContext<AuthContextValue | null>(null)

/**
 * Split from `AuthContext.tsx` so the provider file only exports components.
 * Same reason the theme and movie contexts are split: the `react-refresh` lint
 * rule rejects a file exporting both a component and a non-component.
 */
export function useAuth(): AuthContextValue {
  const value = useContext(AuthContext)
  if (value === null) {
    throw new Error('useAuth must be used inside <AuthProvider>')
  }
  return value
}
