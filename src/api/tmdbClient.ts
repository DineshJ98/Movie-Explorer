import axios, {
  AxiosError,
  type AxiosInstance,
  type InternalAxiosRequestConfig,
} from 'axios'

/** Marker attached to failed responses so callers can branch without string-matching. */
export const TMDB_UNAUTHORIZED = 'TMDB_UNAUTHORIZED' as const
export const TMDB_NOT_FOUND = 'TMDB_NOT_FOUND' as const
export const TMDB_MISSING_TOKEN = 'TMDB_MISSING_TOKEN' as const

const token = import.meta.env.VITE_TMDB_TOKEN

if (!token) {
  console.warn(
    '[tmdb] VITE_TMDB_TOKEN is not set. Every API request will fail. ' +
      'Copy .env.example to .env.local and add a TMDB v4 API Read Access Token.',
  )
}

/**
 * Dev uses the Vite proxy at `/tmdb`, which rewrites the prefix to `/3` so the
 * app avoids CORS and never hardcodes an API host.
 *
 * That proxy is a property of `vite dev` and **does not exist in the production
 * bundle**, so a hardcoded `/tmdb` base URL 404s on every request once deployed
 * (verified on Vercel). Production therefore talks to TMDB directly, which its
 * CORS policy explicitly allows: `access-control-allow-origin: *` with
 * `Authorization` in `access-control-allow-headers`.
 */
const apiBaseUrl = import.meta.env.DEV
  ? '/tmdb'
  : `https://api.themoviedb.org/3`

export const tmdbClient: AxiosInstance = axios.create({
  baseURL: apiBaseUrl,
  timeout: 15_000,
  headers: { accept: 'application/json' },
  params: { language: 'en-US' },
})

tmdbClient.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  if (token) {
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
    } else if (!token) {
      error.message = TMDB_MISSING_TOKEN
    }

    return Promise.reject(error)
  },
)
