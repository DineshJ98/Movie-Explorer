/**
 * POST /api/tmdb/authentication/session/new -> TMDB /3/authentication/session/new
 *
 * Exchanges the approved request_token for a session_id. The browser posts the
 * request_token in the body; it is forwarded untouched so the proxy never has to
 * parse user credentials.
 */
import { tmdbRoute } from '../../../../server/tmdbProxy.js'

export default tmdbRoute({ methods: ['POST'], resource: 'authentication/session/new' })