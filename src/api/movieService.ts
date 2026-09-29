import { tmdbClient } from './tmdbClient'
import type { PagedResult } from '../types/pagination'
import type {
  TmdbMovie,
  TmdbMovieDetail,
  TmdbMovieListResponse,
  TmdbPagedResponse,
} from '../types/tmdb'

interface RequestOptions {
  signal?: AbortSignal
}

/**
 * Normalizes TMDB's paged envelope.
 *
 * Note the `results` guard: an empty search returns `total_pages: 1` with zero
 * results (verified live), so `page < total_pages` alone reports `hasMore`
 * when there is nothing to load. TMDB can also omit the array entirely.
 */
function toPagedResult<T>(response: TmdbPagedResponse<T>, requestedPage: number): PagedResult<T> {
  const items = response.results ?? []
  const totalResults = response.total_results ?? items.length
  const totalPages = response.total_pages ?? 1

  return {
    page: response.page ?? requestedPage,
    totalPages,
    totalResults,
    items,
    hasMore: items.length > 0 && requestedPage < totalPages,
  }
}

export async function getTrending(
  page = 1,
  { signal }: RequestOptions = {},
): Promise<PagedResult<TmdbMovie>> {
  const { data } = await tmdbClient.get<TmdbMovieListResponse>('/trending/movie/week', {
    params: { page },
    signal,
  })
  return toPagedResult(data, page)
}

export async function searchMovies(
  query: string,
  page = 1,
  { signal }: RequestOptions = {},
): Promise<PagedResult<TmdbMovie>> {
  const { data } = await tmdbClient.get<TmdbMovieListResponse>('/search/movie', {
    params: { query, page, include_adult: false },
    signal,
  })
  return toPagedResult(data, page)
}

export async function getMovieDetails(
  id: number,
  { signal }: RequestOptions = {},
): Promise<TmdbMovieDetail> {
  const { data } = await tmdbClient.get<TmdbMovieDetail>('/movie/' + id, {
    params: { append_to_response: 'credits,videos' },
    signal,
  })
  return data
}
