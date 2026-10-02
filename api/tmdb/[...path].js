/**
 * TMDB proxy.
 *
 * Purpose: keep `TMDB_TOKEN` out of the client bundle. A `VITE_`-prefixed variable
 * is inlined into the JavaScript at build time and is therefore readable by anyone
 * who views source, so the token used to live in `dist/`.
 *
 * SCOPE, stated plainly: this hides the *API token*, which grants read-only access
 * to TMDB's public catalogue. It does **not** protect the user's `session_id`, which
 * still travels from the browser through here to TMDB, because the browser is the
 * thing making the call. This is a token-hygiene measure, not a security boundary.
 *
 * Because this endpoint is public and unauthenticated, it is a strict ALLOWLIST
 * rather than a pass-through. A proxy that forwards any path would be an open relay
 * that anyone could use to reach TMDB (or anything else) through your deployment.
 */

const TMDB_ORIGIN = process.env.TMDB_API_ORIGIN ?? 'https://api.themoviedb.org'

/** Only the seven endpoints the app actually calls. Anything else is a 404. */
const ALLOWED = [
  { method: 'GET', pattern: /^trending\/movie\/week$/ },
  { method: 'GET', pattern: /^search\/movie$/ },
  { method: 'GET', pattern: /^movie\/\d+$/ },
  { method: 'GET', pattern: /^authentication\/token\/new$/ },
  { method: 'POST', pattern: /^authentication\/session\/new$/ },
  { method: 'GET', pattern: /^account$/ },
  { method: 'DELETE', pattern: /^authentication\/session$/ },
]

/** `api_key` would let a caller bypass the bearer token; `api_token` is not ours to accept. */
const BLOCKED_QUERY_PARAMS = new Set(['api_key', 'api_token'])

export default async function handler(req, res) {
  if (!process.env.TMDB_TOKEN) {
    // A misconfigured deployment, not a client error. Never echo the token.
    return json(res, 500, {
      status_message:
        'TMDB_TOKEN is not configured on the server. Add it in the Vercel project settings.',
    })
  }

  // Vercel normally exposes a catch-all as `req.query.path`, an array of segments.
  // It is not guaranteed. Under a `functions` mount, and under some rewrite
  // configurations, it comes back empty, which silently produced an empty
  // `resource` that then failed every allowlist test -- including `/account`,
  // which is allowed. Parse the path from the URL too and use whichever source
  // actually has segments, so a routing-metadata quirk cannot break the proxy.
  const fromQuery = Array.isArray(req.query?.path) ? req.query.path : []
  const segments = fromQuery.length > 0 ? fromQuery : pathSegmentsFromUrl(req.url)
  const resource = segments.map((s) => decodeURIComponent(s)).join('/')

  const rule = ALLOWED.find((r) => r.method === req.method && r.pattern.test(resource))
  if (!rule) {
    // 404 rather than 403: do not confirm which paths exist.
    return json(res, 404, {
      status_message: `No TMDB proxy route for ${req.method} /${resource}`,
    })
  }

  // Forward only the caller's own query string, minus anything that could
  // override authentication. The `language` and `page` params ride along.
  const incoming = new URL(req.url, 'http://localhost').searchParams
  const outgoing = new URLSearchParams()
  for (const [key, value] of incoming) {
    if (!BLOCKED_QUERY_PARAMS.has(key)) outgoing.append(key, value)
  }

  const target = new URL(`/3/${resource}`, TMDB_ORIGIN)
  if ([...outgoing].length > 0) target.search = outgoing.toString()

  const hasBody = req.method === 'POST' && req.body !== undefined && req.body !== null
  const body = hasBody
    ? typeof req.body === 'string'
      ? req.body
      : JSON.stringify(req.body)
    : undefined

  let upstream
  try {
    upstream = await fetch(target, {
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

function json(res, status, payload) {
  res.status(status)
  res.setHeader('content-type', 'application/json')
  res.setHeader('cache-control', 'no-store')
  return res.send(JSON.stringify(payload))
}

/**
 * Path segments of the request URL, tolerating the `/api/tmdb` mount prefix being
 * present or already stripped. Query string ignored. Empty segments (a leading,
 * trailing, or doubled slash) are dropped rather than producing an empty segment
 * that would never match an allowlist pattern.
 */
function pathSegmentsFromUrl(url = '') {
  return String(url)
    .split('?')[0]
    .replace(/^\/api\/tmdb/, '')
    .split('/')
    .filter(Boolean)
}
