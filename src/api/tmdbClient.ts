import axios, { AxiosError, type AxiosInstance } from 'axios'

/** Marker attached to failed responses so callers can branch without string-matching. */
export const TMDB_UNAUTHORIZED = 'TMDB_UNAUTHORIZED' as const
export const TMDB_NOT_FOUND = 'TMDB_NOT_FOUND' as const
export const TMDB_UPSTREAM_UNREACHABLE = 'TMDB_UPSTREAM_UNREACHABLE' as const

/**
 * Read access to TMDB's public catalogue. This is a v4 read token, not a user
 * credential: it can read public data and nothing else.
 *
 * The token is NEVER held here. Both environments inject it server-side: in
 * production `api/tmdb/[...path].js` reads `TMDB_TOKEN`, and in development the
 * Vite proxy at `/api/tmdb` does the same. That is deliberate. A `VITE_`-prefixed
 * variable is inlined into the bundle, so putting the token here made it readable
 * by anyone who views source, and it made development and production disagree about
 * where the token lives - which is the sort of difference that only shows up as a
 * bug once deployed.
 *
 * A missing token is therefore reported by the proxy itself (500 with a
 * `status_message`), not by this module guessing at the environment.
 */
const apiBaseUrl = '/api/tmdb'

export const tmdbClient: AxiosInstance = axios.create({
  baseURL: apiBaseUrl,
  timeout: 15_000,
  headers: { accept: 'application/json' },
  params: { language: 'en-US' },
})

tmdbClient.interceptors.response.use(
  (response) => response,
  (error: AxiosError<{ status_code?: number; status_message?: string }>) => {
    const status = error.response?.status

    if (status === 401 || status === 403) {
      error.message = TMDB_UNAUTHORIZED
    } else if (status === 404) {
      error.message = TMDB_NOT_FOUND
} else if (status === 504) {
        // The proxy could not reach TMDB. Distinct from an auth failure.
        error.message = TMDB_UPSTREAM_UNREACHABLE
      }

    return Promise.reject(error)
  },
)
