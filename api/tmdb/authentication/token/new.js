/**
 * GET /api/tmdb/authentication/token/new -> TMDB /3/authentication/token/new
 *
 * The first step of the TMDB sign-in handshake. Without this route the whole
 * login flow fails in production, because the edge 404s the path before the
 * proxy can see it.
 */
import { tmdbRoute } from '../../../../server/tmdbProxy.js'

export default tmdbRoute({ methods: ['GET'], resource: 'authentication/token/new' })