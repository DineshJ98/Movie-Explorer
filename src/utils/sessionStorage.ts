import { STORAGE_KEYS, readStoredValue, removeStoredValue, writeStoredValue } from './storage'
import type { StoredSession } from '../types/tmdbAuth'

/**
 * Session persistence.
 *
 * Deliberately hand-rolled rather than reusing `readStoredValue` blindly: the
 * stored blob is untrusted input. A user can edit localStorage, and an older
 * build may have left a differently-shaped object behind, so every field is
 * validated on read. A malformed entry is discarded rather than trusted,
 * because `session_id` is a write credential for a real account and a garbage
 * value would fail confusingly on the first `/account` call.
 *
 * Only the five fields in `StoredSession` are written. The TMDB account password
 * never reaches this app at all, and the short-lived approval token is
 * exchanged for a session id before anything is persisted.
 */
function isStoredSession(value: unknown): value is StoredSession {
  if (typeof value !== 'object' || value === null) return false
  const candidate = value as Record<string, unknown>

  return (
    typeof candidate.session_id === 'string' &&
    candidate.session_id.length > 0 &&
    typeof candidate.account_id === 'number' &&
    Number.isFinite(candidate.account_id) &&
    typeof candidate.username === 'string' &&
    (typeof candidate.avatar_path === 'string' || candidate.avatar_path === null) &&
    typeof candidate.saved_at === 'number'
  )
}

export function readStoredSession(): StoredSession | null {
  const raw = readStoredValue<unknown>(STORAGE_KEYS.session, null)
  if (!isStoredSession(raw)) {
    // A present-but-invalid entry is worse than none, so clear it.
    if (raw !== null) removeStoredSession()
    return null
  }
  return raw
}

export function writeStoredSession(session: Omit<StoredSession, 'saved_at'>): StoredSession {
  const stored: StoredSession = { ...session, saved_at: Date.now() }
  writeStoredValue(STORAGE_KEYS.session, stored)
  return stored
}

export function removeStoredSession(): void {
  removeStoredValue(STORAGE_KEYS.session)
}

/**
 * Where to send the user once TMDB approval comes back.
 *
 * The round trip leaves the app entirely, so the router's `location.state`
 * cannot survive it. Without this, a signed-out user who deep-linked to
 * `/favorites` would silently land on the dashboard after signing in.
 *
 * Only same-origin absolute paths are accepted. A tampered value is rejected so
 * a crafted localStorage entry cannot turn the callback into an open redirect.
 */
export function writePendingRedirect(path: string | null): void {
  if (path === null) {
    removePendingRedirect()
    return
  }
  // Must start with a single "/" and must not be protocol-relative ("//evil.com").
  if (!/^\/(?!\/)/.test(path)) return
  writeStoredValue(STORAGE_KEYS.pendingRedirect, path)
}

export function readPendingRedirect(): string | null {
  const raw = readStoredValue<unknown>(STORAGE_KEYS.pendingRedirect, null)
  if (typeof raw !== 'string' || !/^\/(?!\/)/.test(raw)) {
    if (raw !== null) removePendingRedirect()
    return null
  }
  return raw
}

export function removePendingRedirect(): void {
  removeStoredValue(STORAGE_KEYS.pendingRedirect)
}
