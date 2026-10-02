/** GET /api/tmdb/trending/movie/week -> TMDB /3/trending/movie/week */
import { tmdbRoute } from '../../../../server/tmdbProxy.js'

export default tmdbRoute({ methods: ['GET'], resource: 'trending/movie/week' })