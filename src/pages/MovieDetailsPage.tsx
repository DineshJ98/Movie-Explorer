import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Chip from '@mui/material/Chip'
import Divider from '@mui/material/Divider'
import Rating from '@mui/material/Rating'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import { useNavigate, useParams } from 'react-router-dom'
import ExpandableText from '../components/ExpandableText'
import PageContainer from '../components/layout/PageContainer'
import CastList from '../components/movie/CastList'
import { DetailSkeleton } from '../components/movie/DetailSkeleton'
import EmptyState from '../components/movie/EmptyState'
import FavoriteButton from '../components/movie/FavoriteButton'
import { useMovieDetails } from '../hooks/useMovieDetails'
import type { TmdbMovieDetail } from '../types/tmdb'
import { getBackdropUrl, getPosterUrl } from '../utils/imageUrl'
import {
  formatCount,
  formatRating,
  formatReleaseDate,
  formatRuntime,
  formatYear,
} from '../utils/format'

/**
 * Parses the `:id` route param.
 *
 * `Number('')` is 0 and `Number(' 550 ')` is 550, so the string is trimmed and
 * matched against digits before conversion. Without this, `/dashboard/abc`
 * becomes NaN and the service is asked for a movie that cannot exist.
 */
function parseId(raw: string | undefined): number | null {
  if (!raw) return null
  const trimmed = raw.trim()
  if (!/^\d+$/.test(trimmed)) return null

  const id = Number(trimmed)
  // TMDB ids are positive; 0 is never a real movie.
  return Number.isInteger(id) && id > 0 ? id : null
}

function findTrailerKey(movie: TmdbMovieDetail): string | null {
  const videos = movie.videos?.results
  if (!videos) return null

  // Prefer an official trailer, then any trailer. `site` and `type` are optional
  // in the type but are always present in the videos payload.
  const trailer = videos.find((v) => v.site === 'YouTube' && v.type === 'Trailer' && v.official) ??
    videos.find((v) => v.site === 'YouTube' && v.type === 'Trailer')
  return trailer?.key ?? null
}

function MovieDetailsView({ id }: { id: number }) {
  const { movie, status, error, retry } = useMovieDetails(id)

  if (status === 'loading') {
    return (
      <PageContainer>
        <DetailSkeleton />
      </PageContainer>
    )
  }

  if (status === 'error' || !movie) {
    return (
      <PageContainer>
        {error ? (
          <Alert severity="error" sx={{ mb: 3 }} action={<Button onClick={retry}>Retry</Button>}>
            {error}
          </Alert>
        ) : null}
        <EmptyState
          title="We could not load this movie"
          message="Check the link, or try again in a moment."
          actionLabel="Try again"
          onAction={retry}
        />
      </PageContainer>
    )
  }

  const year = formatYear(movie.release_date)
  const released = formatReleaseDate(movie.release_date)
  const runtime = formatRuntime(movie.runtime)
  const rating = formatRating(movie.vote_average)
  const voteCount = formatCount(movie.vote_count)
  const backdrop = getBackdropUrl(movie.backdrop_path, 'w780')
  const trailerKey = findTrailerKey(movie)
  const cast = movie.credits?.cast ?? []

  return (
    <PageContainer>
      {/* Backdrop sits full-bleed at the top. It is decorative: the title is
          repeated as the h1 below, so it is hidden from screen readers. */}
      <Box
        aria-hidden="true"
        sx={{
          position: 'relative',
          // Full-bleed across the Container's gutter. The negative margin must
          // track the Container's responsive padding (16px at xs, 24px from sm)
          // or the backdrop overflows and the page scrolls sideways on mobile.
          mx: { xs: -2, sm: -3 },
          aspectRatio: { xs: '16 / 10', sm: '21 / 9' },
          maxHeight: { xs: 240, sm: 380 },
          borderRadius: 2,
          overflow: 'hidden',
          backgroundColor: 'action.hover',
          backgroundImage: backdrop ? `url(${backdrop})` : 'none',
          backgroundSize: 'cover',
          backgroundPosition: 'center top',
        }}
      >
        {/* Fade the backdrop into the page so the two edges do not clash. */}
        <Box
          sx={{
            position: 'absolute',
            inset: 0,
            background: 'linear-gradient(to top, var(--mui-palette-background-default) 2%, transparent 60%)',
          }}
        />
      </Box>

      <Box
        sx={{
          display: 'grid',
          gap: { xs: 3, md: 4 },
          gridTemplateColumns: { xs: '1fr', md: '220px minmax(0, 1fr)' },
          alignItems: 'start',
          mt: { xs: 2, md: 0 },
        }}
      >
        <Box
          component="img"
          src={getPosterUrl(movie.poster_path, 'w342')}
          alt={`${movie.title} poster`}
          sx={{
            width: '100%',
            // Capped so it does not dominate a phone screen, and centred
            // because the grid column is wider than the cap on mobile.
            maxWidth: { xs: 220, md: 'none' },
            mx: { xs: 'auto', md: 0 },
            aspectRatio: '2 / 3',
            objectFit: 'cover',
            borderRadius: 1.5,
            display: 'block',
          }}
        />

        <Stack spacing={2.5} sx={{ minWidth: 0 }}>
          <Box>
            <Typography variant="h4" component="h1" sx={{ fontWeight: 700, lineHeight: 1.2 }}>
              {movie.title}
            </Typography>
            {movie.tagline ? (
              <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5, fontStyle: 'italic' }}>
                {movie.tagline}
              </Typography>
            ) : null}
          </Box>

          <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap', gap: 1, alignItems: 'center' }}>
            {released ? (
              <Chip size="small" label={released} variant="outlined" />
            ) : year ? (
              <Chip size="small" label={year} variant="outlined" />
            ) : null}
            {runtime ? <Chip size="small" label={runtime} variant="outlined" /> : null}
            {movie.status ? <Chip size="small" label={movie.status} variant="outlined" /> : null}
            {movie.genres?.map((genre) => (
              <Chip key={genre.id} size="small" label={genre.name} color="primary" />
            ))}
          </Stack>

          <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
            {rating ? (
              <>
                <Rating
                  value={Number(rating)}
                  precision={0.1}
                  readOnly
                  size="small"
                  aria-label={`Average rating ${rating} out of 10`}
                />
                <Typography variant="body2" sx={{ fontWeight: 600 }}>
                  {rating}
                  <Typography component="span" variant="body2" color="text.secondary">
                    /10
                  </Typography>
                </Typography>
                {voteCount ? (
                  <Typography variant="caption" color="text.secondary">
                    ({voteCount} votes)
                  </Typography>
                ) : null}
              </>
            ) : (
              // A 0.0 average means "no votes yet", not a universally panned film.
              <Typography variant="body2" color="text.secondary">
                Not rated yet
              </Typography>
            )}
          </Stack>

          {movie.overview ? (
            <Box>
              <Typography variant="subtitle2" component="h2" sx={{ fontWeight: 600, mb: 0.5 }}>
                Overview
              </Typography>
              <ExpandableText text={movie.overview} collapsedLines={4} minHeight={102} />
            </Box>
          ) : null}

          <FavoriteButton />

          <Divider />

          {trailerKey ? (
            <Box>
              <Typography variant="subtitle2" component="h2" sx={{ fontWeight: 600, mb: 1 }}>
                Trailer
              </Typography>
              <Box
                sx={{
                  position: 'relative',
                  aspectRatio: '16 / 9',
                  width: '100%',
                  borderRadius: 1.5,
                  overflow: 'hidden',
                  backgroundColor: '#000',
                }}
              >
                <Box
                  component="iframe"
                  // youtube-nocookie avoids setting tracking cookies until play.
                  src={`https://www.youtube-nocookie.com/embed/${trailerKey}?rel=0`}
                  title={`${movie.title} trailer`}
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                  loading="lazy"
                  sx={{ position: 'absolute', inset: 0, width: '100%', height: '100%', border: 0 }}
                />
              </Box>
            </Box>
          ) : null}

          {cast.length > 0 ? (
            <Box>
              <Typography variant="subtitle2" component="h2" sx={{ fontWeight: 600, mb: 1.5 }}>
                Cast
              </Typography>
              <CastList cast={cast} />
            </Box>
          ) : null}
        </Stack>
      </Box>
    </PageContainer>
  )
}

export default function MovieDetailsPage() {
  const { id: rawId } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const id = parseId(rawId)

  if (id === null) {
    return (
      <PageContainer>
        <EmptyState
          title="That is not a valid movie link"
          message="The address should end in a numeric TMDB movie id, for example /dashboard/550."
          actionLabel="Back to trending"
          onAction={() => {
            navigate('/dashboard')
          }}
        />
      </PageContainer>
    )
  }

  // Separate component so the hook is only ever called with a valid id.
  return <MovieDetailsView id={id} />
}
