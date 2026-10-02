import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import { getTrending, searchMovies } from '../api/movieService'
import { toApiMessage } from '../utils/apiErrors'
import { useDebounce } from '../hooks/useDebounce'
import type { TmdbMovie } from '../types/tmdb'
import { useAuth } from './authContextValue'
import { MovieContext, type LoadStatus, type MovieContextValue } from './movieContextValue'

/** Below this length a query is too broad to be worth a request. */
const MIN_QUERY_LENGTH = 2
/** TMDB reports 500 pages for trending; an uncapped loader would run forever. */
const MAX_PAGES = 10

interface RequestState {
  /** The term these results belong to. Compared against the active term. */
  term: string
  items: TmdbMovie[]
  page: number
  hasMore: boolean
  error: string | null
}


export function MovieProvider({ children }: { children: ReactNode }) {
  const { status: authStatus } = useAuth()
  const isAuthenticated = authStatus === 'authenticated'

  const [query, setQuery] = useState('')
  const [result, setResult] = useState<RequestState>({
    term: '',
    items: [],
    page: 0,
    hasMore: false,
    error: null,
  })
  const [status, setStatus] = useState<LoadStatus>('loading')

  const debouncedQuery = useDebounce(query, 400)
  const activeQuery = debouncedQuery.trim()
  // A query shorter than the minimum is not a search yet. Treat it as no query
  // at all so trending stays on screen instead of the grid blanking out, and no
  // request is sent for a one-character term.
  const effectiveQuery = activeQuery.length >= MIN_QUERY_LENGTH ? activeQuery : ''
  const isSearching = effectiveQuery.length > 0

  const requestIdRef = useRef(0)
  const abortRef = useRef<AbortController | null>(null)

  const fetchPage = useCallback(async (term: string, page: number, mode: 'replace' | 'append') => {
    abortRef.current?.abort()
    const controller = new AbortController()
    abortRef.current = controller

    requestIdRef.current += 1
    const requestId = requestIdRef.current

    try {
      const res =
        term.length > 0
          ? await searchMovies(term, page, { signal: controller.signal })
          : await getTrending(page, { signal: controller.signal })

      // A newer request started while this one was in flight. Its response
      // wins, so drop this one rather than overwriting fresher results.
      if (requestId !== requestIdRef.current) return

      setResult((prev) => {
        const base = mode === 'append' && prev.term === term ? prev.items : []
        // TMDB recycles titles across trending pages (199 results over the first
        // 10 pages contain 20 duplicates), so dedupe on append. Order is kept.
        const seen = new Set(base.map((m) => m.id))
        const fresh = res.items.filter((m) => !seen.has(m.id))
        return {
          term,
          items: [...base, ...fresh],
          page,
          hasMore: res.hasMore && page < MAX_PAGES,
          error: null,
        }
      })
      setStatus('success')
    } catch (e) {
      if (requestId !== requestIdRef.current) return
      if (controller.signal.aborted) return

      setResult((prev) => ({ ...prev, error: toApiMessage(e, 'Those results could not be found.') }))
      setStatus('error')
    }
  }, [])

  // Fetch page 1 whenever the effective term changes, and only once a session
  // exists. This provider wraps the whole app layout, so without the auth gate
  // it would fire a trending request for anonymous visitors on /login and on
  // any protected route that is about to redirect. Gating here rather than
  // moving the provider below ProtectedRoute keeps the loaded list alive across
  // dashboard -> details -> dashboard navigation, which re-mounting would lose.
  useEffect(() => {
    if (!isAuthenticated) return
    setStatus('loading')
    void fetchPage(effectiveQuery, 1, 'replace')
  }, [isAuthenticated, effectiveQuery, fetchPage])

  useEffect(() => {
    return () => {
      abortRef.current?.abort()
    }
  }, [])

  // Results for a term other than the active one are stale; ignore them rather
  // than showing the previous search while the new one loads. Memoized so the
  // identity is stable and consumers' useMemo deps do not fire every render.
  const isFresh = result.term === effectiveQuery
  const trending = useMemo(
    () => (!effectiveQuery && isFresh ? result.items : []),
    [effectiveQuery, isFresh, result.items],
  )
  const searchResults = useMemo(
    () => (effectiveQuery.length > 0 && isFresh ? result.items : []),
    [effectiveQuery, isFresh, result.items],
  )
  const movies = isSearching ? searchResults : trending

  const loadMore = useCallback(() => {
    if (status === 'loading' || status === 'loading-more') return
    if (!result.hasMore) return
    setStatus('loading-more')
    void fetchPage(effectiveQuery, result.page + 1, 'append')
  }, [status, result.hasMore, result.page, effectiveQuery, fetchPage])

  const retry = useCallback(() => {
    setStatus('loading')
    const page = result.page === 0 ? 1 : result.page
    void fetchPage(effectiveQuery, page, result.page === 0 ? 'replace' : 'append')
  }, [effectiveQuery, result.page, fetchPage])

  const error = isFresh ? result.error : null

  const value = useMemo<MovieContextValue>(
    () => ({
      trending,
      searchResults,
      movies,
      query,
      setQuery,
      isSearching,
      status,
      error,
      hasMore: isFresh && result.hasMore,
      isCapped: isFresh && !result.hasMore && result.items.length > 0,
      loadMore,
      retry,
    }),
    [
      trending, searchResults, movies, query, isSearching, status,
      error, isFresh, result.hasMore, result.items.length, loadMore, retry,
    ],
  )

  return <MovieContext.Provider value={value}>{children}</MovieContext.Provider>
}
