import { useCallback, useEffect, useRef, useState } from 'react'
import { getMovieDetails } from '../api/movieService'
import { TMDB_NOT_FOUND, TMDB_UNAUTHORIZED } from '../api/tmdbClient'
import type { TmdbMovieDetail } from '../types/tmdb'

export type DetailStatus = 'loading' | 'success' | 'error'

export interface UseMovieDetailsResult {
  movie: TmdbMovieDetail | null
  status: DetailStatus
  error: string | null
  retry: () => void
}

interface DetailState {
  /** The id these results belong to. Compared against the requested id. */
  id: number | null
  movie: TmdbMovieDetail | null
  error: string | null
}

function toMessage(error: unknown, id: number): string {
  const message = error instanceof Error ? error.message : ''

  if (message === TMDB_NOT_FOUND) {
    return `We could not find a movie with id ${id}. It may have been removed from TMDB.`
  }
  if (message === TMDB_UNAUTHORIZED) {
    return 'TMDB rejected the API token. Check VITE_TMDB_TOKEN in your .env.local file.'
  }
  return 'Something went wrong loading this movie. Please try again.'
}

/**
 * Loads one movie by id, with nothing but the id.
 *
 * This is deliberately independent of `MovieContext`. The details route has to
 * survive a hard refresh or a shared link, where no list has ever been loaded,
 * so it can never read from a list cache. `MovieContext` sits above the router
 * and would always be "empty but valid" on a cold deep link, which is exactly
 * the bug that makes cached detail pages break on refresh.
 *
 * `retry` bumps a counter rather than storing the id in state, so the effect
 * re-runs with the same id and a fresh request.
 */
export function useMovieDetails(id: number): UseMovieDetailsResult {
  const [state, setState] = useState<DetailState>({ id: null, movie: null, error: null })
  const [status, setStatus] = useState<DetailStatus>('loading')
  const [attempt, setAttempt] = useState(0)

  const requestIdRef = useRef(0)
  const abortRef = useRef<AbortController | null>(null)

  useEffect(() => {
    abortRef.current?.abort()
    const controller = new AbortController()
    abortRef.current = controller

    requestIdRef.current += 1
    const requestId = requestIdRef.current

    // Every setState lives in here, after the first await, never synchronously
    // in the effect body. See the react-hooks/set-state-in-effect note in Agent.MD.
    const load = async () => {
      setStatus('loading')
      try {
        const movie = await getMovieDetails(id, { signal: controller.signal })
        // A newer request (id change, or retry) started while this was in flight.
        if (requestId !== requestIdRef.current) return

        setState({ id, movie, error: null })
        setStatus('success')
      } catch (e) {
        if (requestId !== requestIdRef.current) return
        if (controller.signal.aborted) return

        setState((prev) => ({ ...prev, id, error: toMessage(e, id) }))
        setStatus('error')
      }
    }

    void load()

    return () => {
      controller.abort()
    }
  }, [id, attempt])

  const retry = useCallback(() => {
    setAttempt((n) => n + 1)
  }, [])

  // Results for a different id are stale. Ignore them rather than showing the
  // previous movie under the new URL while the new one loads.
  const isFresh = state.id === id
  const movie = isFresh ? state.movie : null
  const error = isFresh ? state.error : null

  return {
    movie,
    status: isFresh ? status : 'loading',
    error,
    retry,
  }
}
