/**
 * App-level pagination shape. Services return this so pages never import the
 * raw `TmdbPagedResponse` envelope. Every consumer — grid, search, favorites —
 * reads one shape regardless of which TMDB endpoint fed it.
 */
export interface PagedResult<T> {
  page: number
  totalPages: number
  totalResults: number
  items: T[]
  hasMore: boolean
}
