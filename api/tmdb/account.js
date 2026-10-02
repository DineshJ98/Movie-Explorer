/** GET /api/tmdb/account -> TMDB /3/account. Per-user, so never cached. */
import { tmdbRoute } from '../../server/tmdbProxy.js'

export default tmdbRoute({ methods: ['GET'], resource: 'account' })