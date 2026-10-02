/**
 * GET /api/tmdb/movie/:id -> TMDB /3/movie/:id
 *
 * The id is interpolated into the forwarded path, so it is built here and then
 * validated by `SAFE_RESOURCE` in the proxy. Anything that is not a plain run of
 * digits therefore fails before a request is made, rather than reaching TMDB as
 * a malformed or traversing path.
 */
import { tmdbRoute } from '../../../server/tmdbProxy.js'

export default tmdbRoute({
  methods: ['GET'],
  resource: (req) => `movie/${String(req.query?.id ?? '')}`,
})