import axios, {
  AxiosError,
  type AxiosInstance,
  type InternalAxiosRequestConfig,
} from 'axios'

/** Marker attached to failed responses so callers can branch without string-matching. */
export const TMDB_UNAUTHORIZED = 'TMDB_UNAUTHORIZED' as const
export const TMDB_NOT_FOUND = 'TMDB_NOT_FOUND' as const
export const TMDB_MISSING_TOKEN = 'TMDB_MISSING_TOKEN' as const
export const TMDB_UPSTREAM_UNREACHABLE = 'TMDB_UPSTREAM_UNREACHABLE' as const

/**
 * Read access to TMDB's public catalogue. This is a v4 read token, not a user
 * credential: it can read public data and nothing else.
 *
 * It is `VITE_`-prefixed, which means Vite inlines it into the bundle, and a
 * bundled value is public. That is unavoidable in development, where the Vite dev
 * proxy needs somewhere to get the token from. In production it must not be set:
 * `api/tmdb/[...path].js` injects `TMDB_TOKEN` server-side instead.
 */
const token = import.meta.env.VITE_TMDB_TOKEN

if (import.meta.env.DEV && !token) {
  console.warn(
    '[tmdb] VITE_TMDB_TOKEN is not set. Every API request will fail. ' +
      'Copy .env.example to .env.local and add a TMDB v4 API Read Access Token. ' +
      'This is only needed locally; production reads TMDB_TOKEN on the server.',
  )
}

/**
 * Dev talks to the Vite proxy at `/tmdb`, which rewrites the prefix to `/3`.
 *
 * Production talks to `/api/tmdb`, the serverless function. The proxy must exist
 * for *both* environments: with no rewrite config, a hardcoded `/tmdb` base URL
 * 404s everywhere except `vite dev`, which is how sign-in broke on Vercel.
 */
const apiBaseUrl = import.meta.env.DEV ? '/tmdb' : '/api/tmdb'

export const tmdbClient: AxiosInstance = axios.create({
  baseURL: apiBaseUrl,
  timeout: 15_000,
  headers: { accept: 'application/json' },
  params: { language: 'en-US' },
})

tmdbClient.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  // Only in dev. In production the function adds the Authorization header, and
  // sending one from here would be pointless: the function ignores it, and a token
  // in the client is what we are trying to avoid.
  if (token && import.meta.env.DEV) {
    config.headers.set('Authorization', `Bearer ${token}`)
  }
  return config
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
    } else if (import.meta.env.DEV && !token) {
      error.message = TMDB_MISSING_TOKEN
    }

    return Promise.reject(error)
  },
)
