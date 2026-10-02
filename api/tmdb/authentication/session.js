/** DELETE /api/tmdb/authentication/session -> TMDB /3/authentication/session (sign out) */
import { tmdbRoute } from '../../../server/tmdbProxy.js'

export default tmdbRoute({ methods: ['DELETE'], resource: 'authentication/session' })