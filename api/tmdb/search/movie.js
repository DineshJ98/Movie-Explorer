/** GET /api/tmdb/search/movie -> TMDB /3/search/movie */
import { tmdbRoute } from '../../../server/tmdbProxy.js'

export default tmdbRoute({ methods: ['GET'], resource: 'search/movie' })