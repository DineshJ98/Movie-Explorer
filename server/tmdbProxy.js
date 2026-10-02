/**
 * TMDB proxy, shared by the route handlers in `api/tmdb/`.
 *
 * Purpose: keep `TMDB_TOKEN` out of the client bundle. A `VITE_`-prefixed variable
 * is inlined into the JavaScript at build time and is therefore readable by anyone
 * who views source, so the token used to live in `dist/`. The Vite dev proxy does
 * the same thing locally, which is why development and production behave the same.
 *
 * SCOPE, stated plainly: this hides the *API token*, which grants read-only access
 * to TMDB's public catalogue. It does **not** protect the user's `session_id`, which
 * still travels from the browser through here to TMDB, because the browser is the
 * thing making the call. This is a token-hygiene measure, not a security boundary.
 *
 * WHY EXPLICIT ROUTES INSTEAD OF ONE CATCH-ALL
 *
 * This used to be a single `api/tmdb/[...path].js` catch-all. Vercel built that
 * file as a *single-segment* route, `/api/tmdb/:path`, not the catch-all
 * `/api/tmdb/:path*` the filename asks for. The result was that no multi-segment
 * TMDB path could reach this function at all: `/api/tmdb/account` worked while
 * `/api/tmdb/movie/550` and `/api/tmdb/authentication/token/new` were rejected by
 * the edge before any code ran, which broke sign-in in production only.
 *
 * Encoding the separator as `%2F` slipped past it (`/api/tmdb/movie%2F550` worked),
 * which is a routing accident, not a contract. Depending on it would be fragile.
 *
 * So each endpoint is now its own file under `api/tmdb/`, and the allowlist is
 * structural: there is no handler that can be reached by a path nobody intended,
 * because the router will not build a route for it.
 */

const TMDB_ORIGIN = process.env.TMDB_API_ORIGIN ?? 'https://api.themoviedb.org'

/** `api_key` would let a caller bypass the bearer token; `api_token` is not ours to accept. */
const BLOCKED_QUERY_PARAMS = new Set(['api_key', 'api_token'])

/**
 * Characters allowed in a forwarded resource. TMDB's read API uses lowercase
 * words, digits, `/` and `-` only, so anything else is a bug or an attempt to
 * escape the `/3/` prefix. Rejecting `..` here is the point of the check.
 */
const SAFE_RESOURCE = /^[a-z0-9]+(?:[/-][a-z0-9]+)*$/

/**
 * Build a Vercel handler for exactly one TMDB endpoint.
 *
 * @param {object} spec
 * @param {string[]} spec.methods  HTTP methods this endpoint accepts.
 * @param {string | ((req: object) => string)} spec.resource
 *   The TMDB resource to forward, e.g. `movie/550`. May be a function so a
 *   dynamic route can interpolate its parameter. Either way it is validated
 *   against SAFE_RESOURCE before use.
 * @returns {(req: object, res: object) => Promise<object>}
 */
export function tmdbRoute({ methods, resource }) {
  return async function handler(req, res) {
    const target = typeof resource === 'function' ? resource(req) : resource

    // 405 rather than 404 here: the route exists, the verb does not. The client
    // only ever sends the correct one.
    if (!methods.includes(req.method)) {
      res.setHeader('allow', methods.join(', '))
      return json(res, 405, {
        status_message: `${req.method} is not allowed on /${target}`,
      })
    }

    if (typeof target !== 'string' || !SAFE_RESOURCE.test(target)) {
      // 404 rather than 403: do not confirm which paths exist.
      return json(res, 404, {
        status_message: `No TMDB proxy route for ${req.method} /${target}`,
      })
    }

    if (!process.env.TMDB_TOKEN) {
      // A misconfigured deployment, not a client error. Never echo the token.
      return json(res, 500, {
        status_message:
          'TMDB_TOKEN is not configured on the server. Add it in the Vercel project settings.',
      })
    }

    // Forward only the caller's own query string, minus anything that could
    // override authentication. The `language` and `page` params ride along.
    const incoming = new URL(req.url, 'http://localhost').searchParams
    const outgoing = new URLSearchParams()
    for (const [key, value] of incoming) {
      if (!BLOCKED_QUERY_PARAMS.has(key)) outgoing.append(key, value)
    }

    const url = new URL(`/3/${target}`, TMDB_ORIGIN)
    if ([...outgoing].length > 0) url.search = outgoing.toString()

    const hasBody = req.method === 'POST' && req.body !== undefined && req.body !== null
    const body = hasBody
      ? typeof req.body === 'string'
        ? req.body
        : JSON.stringify(req.body)
      : undefined

    let upstream
    try {
      upstream = await fetch(url, {
        method: req.method,
        headers: {
          // The server's own token, always. Any Authorization header from the caller
          // is deliberately not forwarded.
          Authorization: `Bearer ${process.env.TMDB_TOKEN}`,
          accept: 'application/json',
          ...(body ? { 'content-type': 'application/json' } : {}),
        },
        ...(body ? { body } : {}),
        signal: AbortSignal.timeout(10_000),
      })
    } catch (error) {
      // Upstream unreachable or timed out. Distinct from a 4xx so the client can
      // tell "TMDB is down" from "your request was wrong".
      return json(res, 504, {
        status_message: `Could not reach TMDB: ${error?.name ?? 'unknown error'}`,
      })
    }

    const text = await upstream.text()
    res.status(upstream.status)
    res.setHeader('content-type', upstream.headers.get('content-type') ?? 'application/json')
    // A shared cache must never store a response that is per-session. `/account` and
    // the session endpoints are per-user, and a CDN replaying one to another visitor
    // would leak an account. Safe-by-default: nothing is cacheable.
    res.setHeader('cache-control', 'no-store')
    return res.send(text)
  }
}

function json(res, status, payload) {
  res.status(status)
  res.setHeader('content-type', 'application/json')
  res.setHeader('cache-control', 'no-store')
  return res.send(JSON.stringify(payload))
}