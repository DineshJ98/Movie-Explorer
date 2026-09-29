/**
 * Auth payload shapes, taken from live TMDB responses rather than from the
 * documented examples. Every optional field marked `?` below was observed to be
 * absent, null, or empty on a real account.
 */

/** `GET /authentication/token/new` */
export interface TmdbRequestToken {
  success: boolean
  /** 40-char hex token. Only valid for the short window TMDB advertises. */
  request_token: string
  /** "2026-09-29 18:06:09 UTC". */
  expires_at: string
}

/** `POST /authentication/session/new` */
export interface TmdbSessionResponse {
  success: boolean
  session_id: string
}

/** `GET /account?session_id=...` */
export interface TmdbAvatar {
  gravatar: {
    hash: string
  } | null
  tmdb: {
    /** Null when the user has not uploaded a TMDB avatar. */
    avatar_path: string | null
  } | null
}

export interface TmdbAccount {
  id: number
  /** Empty string for accounts created without a public username. */
  username: string
  /** Display name. Observed as "" even when username is set. */
  name: string
  avatar: TmdbAvatar | null
  include_adult: boolean
  iso_639_1?: string
  iso_3166_1?: string
  description?: string
  background_image?: string
  accent_color?: number
}

/** Shape used by TMDB's write endpoints, e.g. favourite add/remove. */
export interface TmdbActionResult {
  success: boolean
  status_code?: number
  status_message?: string
}

/**
 * The only session data this app persists.
 *
 * The password is never seen by this app, and the short-lived approval token is
 * exchanged for a session id before anything is written to storage. `saved_at`
 * exists purely so a stale session can be recognised and discarded.
 */
export interface StoredSession {
  session_id: string
  account_id: number
  username: string
  /** Null when the user has no TMDB avatar. */
  avatar_path: string | null
  /** Epoch milliseconds. */
  saved_at: number
}
