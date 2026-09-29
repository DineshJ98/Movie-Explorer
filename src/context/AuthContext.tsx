import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import {
  SESSION_DENIED,
  buildApprovalUrl,
  createRequestToken,
  createSession,
  deleteSession,
  getAccount,
} from '../api/authService'
import { TMDB_UNAUTHORIZED } from '../api/tmdbClient'
import { AuthContext, type AuthContextValue, type AuthStatus } from './authContextValue'
import {
  readStoredSession,
  removeStoredSession,
  writeStoredSession,
} from '../utils/sessionStorage'
import type { TmdbAccount } from '../types/tmdbAuth'

function toMessage(error: unknown): string {
  if (error instanceof Error) {
    if (error.message === SESSION_DENIED) {
      return 'TMDB did not approve that sign-in. It may have expired, or already been used.'
    }
    if (error.message.includes('did not return a request token')) {
      return 'TMDB is not returning an approval token right now. Please try again shortly.'
    }
    if (error.message.includes('did not return an account')) {
      return 'That session could not be resolved to a TMDB account.'
    }
    if (error.message === TMDB_UNAUTHORIZED) {
      return 'TMDB rejected the API token. Check VITE_TMDB_TOKEN in your .env.local file.'
    }
  }
  return 'Sign-in could not be completed. Please try again.'
}

export function AuthProvider({ children }: { children: ReactNode }) {
  /**
   * Read once, lazily, during the first render. localStorage is synchronous and
   * safe to touch here, and this keeps the "no stored session" case out of an
   * effect entirely: the initial status is derived, not set. An effect that
   * only calls setStatus('anonymous') triggers a cascading render that the
   * react-hooks/set-state-in-effect rule correctly rejects.
   */
  const [stored] = useState(() => readStoredSession())

  const [status, setStatus] = useState<AuthStatus>(stored ? 'loading' : 'anonymous')
  const [account, setAccount] = useState<TmdbAccount | null>(null)
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  // Revalidate a stored session on mount. The app gates rendering on
  // `status !== 'loading'`, so a hard refresh on a protected route never
  // flashes /login before this settles.
  useEffect(() => {
    if (!stored) return

    const controller = new AbortController()
    let cancelled = false

    const restore = async () => {
      try {
        const live = await getAccount(stored.session_id, controller.signal)
        if (cancelled) return

        // The stored copy is only a cache. Refresh it so a renamed account or a
        // new avatar shows up, and so account_id can never drift from the
        // session that actually authorises the call.
        writeStoredSession({
          session_id: stored.session_id,
          account_id: live.id,
          username: live.username,
          avatar_path: live.avatar?.tmdb?.avatar_path ?? null,
        })
        setAccount(live)
        setSessionId(stored.session_id)
        setStatus('authenticated')
      } catch (e) {
        if (cancelled || controller.signal.aborted) return

        // A revoked or expired session must be forgotten, not retried forever.
        removeStoredSession()
        setError(toMessage(e))
        setStatus('anonymous')
      }
    }

    void restore()
    return () => {
      cancelled = true
      controller.abort()
    }
  }, [stored])

  const beginLogin = useCallback(() => {
    setError(null)

    const start = async () => {
      try {
        const requestToken = await createRequestToken()
        // Full navigation on purpose: this leaves the app for tmdb.org and
        // cannot be done with the client-side router.
        window.location.assign(buildApprovalUrl(requestToken))
      } catch (e) {
        setError(toMessage(e))
      }
    }

    void start()
  }, [])

  const completeLogin = useCallback(async (requestToken: string): Promise<boolean> => {
    setError(null)

    try {
      const newSessionId = await createSession(requestToken)
      // Resolve the account before persisting, so storage never holds a session
      // that has not been proven to map to a real account.
      const live = await getAccount(newSessionId)

      writeStoredSession({
        session_id: newSessionId,
        account_id: live.id,
        username: live.username,
        avatar_path: live.avatar?.tmdb?.avatar_path ?? null,
      })
      setAccount(live)
      setSessionId(newSessionId)
      setStatus('authenticated')
      return true
    } catch (e) {
      setError(toMessage(e))
      setStatus('anonymous')
      return false
    }
  }, [])

  const logout = useCallback(async () => {
    const current = sessionId
    // Clear locally first. A failed revoke must never strand the user in a
    // half-signed-in state, and the credential is discarded from this app
    // either way.
    setAccount(null)
    setSessionId(null)
    setStatus('anonymous')
    removeStoredSession()

    if (!current) return
    try {
      await deleteSession(current)
    } catch {
      // The local session is already gone. The remote one may survive until it
      // expires, which is why this must not block the sign-out.
    }
  }, [sessionId])

  const clearError = useCallback(() => setError(null), [])

  const value = useMemo<AuthContextValue>(
    () => ({ account, sessionId, status, error, beginLogin, completeLogin, logout, clearError }),
    [account, sessionId, status, error, beginLogin, completeLogin, logout, clearError],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
