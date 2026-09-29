/**
 * TMDB API v3 response shapes.
 *
 * Every field is optional except `id` and `title` on movie types. TMDB omits
 * fields silently rather than sending nulls, and a naive strict model will
 * throw on a missing `poster_path` at runtime. Verified against live responses
 * on 2026-09-29: a trending page of 20 items, a search result set, a detail
 * payload with `append_to_response=credits,videos`, and a 404.
 */

export interface TmdbMovie {
  id: number
  title: string
  original_title?: string
  original_language?: string
  overview?: string
  release_date?: string
  poster_path?: string | null
  backdrop_path?: string | null
  vote_average?: number
  vote_count?: number
  popularity?: number
  adult?: boolean
  video?: boolean
  /** List endpoints return ids here; the detail endpoint returns objects. */
  genre_ids?: number[]
}

export interface TmdbGenre {
  id: number
  name: string
}

export interface TmdbCastMember {
  id: number
  name: string
  character?: string
  profile_path?: string | null
  order?: number
  known_for_department?: string
}

export interface TmdbCrewMember {
  id: number
  name: string
  job?: string
  department?: string
  profile_path?: string | null
}

export interface TmdbVideo {
  id: string
  key: string
  name?: string
  site?: string
  type?: string
  official?: boolean
  published_at?: string
}

export interface TmdbProductionCompany {
  id: number
  name: string
  origin_country?: string
}

export interface TmdbCredits {
  cast?: TmdbCastMember[]
  crew?: TmdbCrewMember[]
}

export interface TmdbMovieDetail extends TmdbMovie {
  runtime?: number | null
  status?: string
  tagline?: string | null
  homepage?: string | null
  imdb_id?: string | null
  budget?: number
  revenue?: number
  genres?: TmdbGenre[]
  belongs_to_collection?: {
    id: number
    name: string
    poster_path?: string | null
  } | null
  production_companies?: TmdbProductionCompany[]
  /** Present only when requested via `append_to_response`. */
  credits?: TmdbCredits
  videos?: { results?: TmdbVideo[] }
}

export interface TmdbPagedResponse<T> {
  page: number
  results: T[]
  total_pages: number
  total_results: number
}

export type TmdbMovieListResponse = TmdbPagedResponse<TmdbMovie>
export type TmdbMovieDetailResponse = TmdbMovieDetail & {
  credits?: TmdbCredits
  videos?: { results?: TmdbVideo[] }
}
