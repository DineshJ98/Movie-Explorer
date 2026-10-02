import { TMDB_UNAUTHORIZED, tmdbClient } from './tmdbClient'
import type {
  TmdbAccount,
  TmdbRequestToken,
  TmdbSessionResponse,
} from '../types/tmdbAuth'

/**
 * Raised when TMDB refuses to exchange an approval token.
 *
 * Distinct from `TMDB_UNAUTHORIZED` on purpose. A 401 from this endpoint almost
 * always means the user declined, closed the tab, or the token was already
 * spent — not that the app's API token is wrong. Without this marker the shared
 * response interceptor rewrites the error and the user is told to check the API
 * token, which has nothing to do with what they just did.
 */
export const SESSION_DENIED = 'TMDB_SESSION_DENIED' as const

/** Where TMDB sends the browser back once the user approves or denies. */
export function buildApprovalUrl(requestToken: string): string {
  const redirect = `${window.location.origin}/auth/callback`
  return `https://www.themoviedb.org/authenticate/${encodeURIComponent(requestToken)}` +
    `?redirect_to=${encodeURIComponent(redirect)}`
}

/**
 * Requests a short-lived approval token.
 *
 * GET, not POST. Verified live against TMDB: `POST` returns
 * `{ success: false, status_code: 34 }` with no token, while `GET` returns a
 * valid 40-character token. TMDB's own reference page and OpenAPI spec both
 * declare this route as GET, and the body form simply does not exist.
 */
export async function createRequestToken(signal?: AbortSignal): Promise<string> {
  const { data } = await tmdbClient.get<TmdbRequestToken>('/authentication/token/new', { signal })

  if (!data?.request_token) {
    throw new Error('TMDB did not return a request token.')
  }
  return data.request_token
}

/**
 * Exchanges an approved request token for a session id.
 *
 * The `request_token` goes in the **body**. Two separate refusals have to be
 * handled, because TMDB signals them differently:
 *
 * - An unapproved or already-spent token returns **HTTP 401** with
 *   `{ success: false, status_code: 17, status_message: "Session denied." }`.
 * - A mismatched token can return **HTTP 200** with `success: false`.
 *
 * Checking the HTTP status alone is therefore not enough, and neither is
 * checking `success` alone. Both are checked, and both produce `SESSION_DENIED`.
 */
export async function createSession(requestToken: string, signal?: AbortSignal): Promise<string> {
  let data: TmdbSessionResponse | undefined

  try {
    const response = await tmdbClient.post<TmdbSessionResponse>(
      '/authentication/session/new',
      { request_token: requestToken },
      { signal },
    )
    data = response.data
  } catch (error) {
    // The shared interceptor has already rewritten the message to
    // TMDB_UNAUTHORIZED by this point. Re-label it as a refusal, keeping the
    // original as `cause` so the underlying response is not lost.
    if (error instanceof Error && error.message === TMDB_UNAUTHORIZED) {
      throw new Error(SESSION_DENIED, { cause: error })
    }
    throw error
  }

  if (!data?.success || !data.session_id) {
    throw new Error(SESSION_DENIED)
  }
  return data.session_id
}

/**
 * Loads the account tied to a session.
 *
 * A `session_id` query parameter is mandatory. Without it TMDB returns **200**
 * with the *API key's own* account rather than an error, so omitting the param
 * would silently sign the user in as the token owner. The account id is read
 * from this response and is never hardcoded.
 */
export async function getAccount(sessionId: string, signal?: AbortSignal): Promise<TmdbAccount> {
  const { data } = await tmdbClient.get<TmdbAccount>('/account', {
    params: { session_id: sessionId },
    signal,
  })

  if (typeof data?.id !== 'number') {
    throw new Error('TMDB did not return an account for that session.')
  }
  return data
}

/**
 * Revokes a session server-side.
 *
 * `session_id` must be a **query parameter**, not a body field. Verified live:
 * omitting it returns 400 "Invalid parameters", and the body form is rejected
 * even though TMDB's docs show one. Always call this on logout, otherwise the
 * credential stays valid on TMDB's side while the UI merely forgets it.
 */
export async function deleteSession(sessionId: string): Promise<void> {
  await tmdbClient.delete('/authentication/session', {
    params: { session_id: sessionId },
  })
}
