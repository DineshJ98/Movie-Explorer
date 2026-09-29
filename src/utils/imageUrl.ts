/**
 * TMDB's image CDN root. Public, unversioned, and stable, so it is safe as a
 * fallback.
 *
 * This module is imported at startup by the poster helpers, so reading the env
 * var unguarded made a missing `VITE_TMDB_IMAGE_BASE` throw during module
 * evaluation and take the whole app down to a blank page. An unset image base
 * should cost broken images, not an unusable UI, so fall back instead.
 */
const DEFAULT_IMAGE_BASE = 'https://image.tmdb.org/t/p'

const base = (import.meta.env.VITE_TMDB_IMAGE_BASE || DEFAULT_IMAGE_BASE).replace(/\/+$/, '')

if (!import.meta.env.VITE_TMDB_IMAGE_BASE) {
  console.warn(
    `[images] VITE_TMDB_IMAGE_BASE is not set; falling back to ${DEFAULT_IMAGE_BASE}. ` +
      'Set it in the environment to override the image CDN.',
  )
}

/** Sizes TMDB serves for posters. Backdrops use the w* family too. */
export type ImageSize = 'w92' | 'w154' | 'w185' | 'w342' | 'w500' | 'w780' | 'original'

/**
 * Builds a TMDB image URL, or null when there is no path.
 *
 * Returning null rather than a broken URL is deliberate: callers can render a
 * placeholder instead of an image element that fails to load. TMDB omits
 * `poster_path` for catalogue entries with no artwork.
 */
export function getImageUrl(path: string | null | undefined, size: ImageSize = 'w500'): string | null {
  if (!path) return null
  return `${base}/${size}${path}`
}

const NO_POSTER = 'https://placehold.co/500x750/e8eaee/6b7280?text=No+poster'

export function getPosterUrl(path: string | null | undefined, size: ImageSize = 'w342'): string {
  return getImageUrl(path, size) ?? NO_POSTER
}

export function getBackdropUrl(path: string | null | undefined, size: ImageSize = 'w780'): string | null {
  return getImageUrl(path, size)
}

export function getAvatarUrl(path: string | null | undefined, size: ImageSize = 'w92'): string | null {
  return getImageUrl(path, size)
}
