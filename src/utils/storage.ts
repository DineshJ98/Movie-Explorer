export const STORAGE_KEYS = {
  theme: 'movieexplorer:theme',
  session: 'me:session',
  favorites: 'movieexplorer:favorites',
  pendingRedirect: 'movieexplorer:pending-redirect',
} as const

export function readStoredValue<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback
  try {
    const raw = window.localStorage.getItem(key)
    if (raw === null) return fallback
    return JSON.parse(raw) as T
  } catch {
    return fallback
  }
}

export function writeStoredValue(key: string, value: unknown): void {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(key, JSON.stringify(value))
  } catch {
    /* Safari private mode and quota-exceeded both land here. */
  }
}

export function removeStoredValue(key: string): void {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.removeItem(key)
  } catch {
    /* nothing actionable */
  }
}
