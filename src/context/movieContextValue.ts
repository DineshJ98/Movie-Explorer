import { createContext, useContext } from 'react'
import type { TmdbMovie } from '../types/tmdb'

/**
 * `loading`    first load, show skeletons
 * `loading-more` appending a page, keep existing tiles visible
 * `success`    results on screen
 * `error`      request failed
 */
export type LoadStatus = 'loading' | 'loading-more' | 'success' | 'error'

export interface MovieContextValue {
  /** Trending list, populated when no search is active. */
  trending: TmdbMovie[]
  /** Search results, populated when a query is active. */
  searchResults: TmdbMovie[]
  /** The tiles currently on screen: search results, else trending. */
  movies: TmdbMovie[]
  query: string
  setQuery: (query: string) => void
  isSearching: boolean
  status: LoadStatus
  error: string | null
  hasMore: boolean
  /** True once the page cap is reached, so the UI can say "end of list". */
  isCapped: boolean
  loadMore: () => void
  retry: () => void
}

export const MovieContext = createContext<MovieContextValue | null>(null)

export function useMovies(): MovieContextValue {
  const ctx = useContext(MovieContext)
  if (ctx === null) {
    throw new Error('useMovies must be used inside a MovieProvider')
  }
  return ctx
}
