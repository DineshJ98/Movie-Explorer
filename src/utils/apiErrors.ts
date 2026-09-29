import { TMDB_NOT_FOUND, TMDB_UNAUTHORIZED, TMDB_UPSTREAM_UNREACHABLE } from '../api/tmdbClient'

/**
 * Shared, user-facing wording for API failures.
 *
 * Kept in one place because the same message was duplicated across three files and
 * had already drifted: the copy told users to fix `VITE_TMDB_TOKEN` in
 * `.env.local`, which is wrong in production. There is no `.env.local` on a
 * deployed host, and the token is not a client value there at all.
 */

/** Which side the token lives on, so the advice matches the environment. */
export function tokenAdvice(): string {
  return import.meta.env.DEV
    ? 'Check VITE_TMDB_TOKEN in your .env.local file.'
    : 'The deployment is missing its TMDB_TOKEN server setting.'
}

export function toApiMessage(error: unknown, notFound: string): string {
  const message = error instanceof Error ? error.message : ''

  if (message === TMDB_UNAUTHORIZED) {
    return `TMDB rejected the API token. ${tokenAdvice()}`
  }
  if (message === TMDB_NOT_FOUND) {
    return notFound
  }
  if (message === TMDB_UPSTREAM_UNREACHABLE) {
    return 'TMDB could not be reached. Please try again in a moment.'
  }
  return 'Something went wrong talking to TMDB. Please try again.'
}
