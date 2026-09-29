import Card from '@mui/material/Card'
import CardActionArea from '@mui/material/CardActionArea'
import CardContent from '@mui/material/CardContent'
import CardMedia from '@mui/material/CardMedia'
import Chip from '@mui/material/Chip'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import { Link as RouterLink } from 'react-router-dom'
import { getPosterUrl } from '../../utils/imageUrl'
import type { TmdbMovie } from '../../types/tmdb'

function releaseYear(releaseDate: string | undefined): string | null {
  if (!releaseDate || releaseDate.length < 4) return null
  const year = releaseDate.slice(0, 4)
  return /^\d{4}$/.test(year) ? year : null
}

export default function MovieCard({ movie }: { movie: TmdbMovie }) {
  const year = releaseYear(movie.release_date)
  const rating =
    movie.vote_average !== undefined && movie.vote_average > 0
      ? movie.vote_average.toFixed(1)
      : null

  return (
    <Card
      component={RouterLink}
      to={`/dashboard/${movie.id}`}
      sx={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        textDecoration: 'none',
        color: 'inherit',
        transition: 'transform 120ms ease, border-color 120ms ease',
        '&:hover': { transform: 'translateY(-2px)', borderColor: 'primary.main' },
        '&:focus-visible': { outline: '2px solid', outlineColor: 'primary.main' },
      }}
    >
      <CardActionArea
        disableRipple
        sx={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'stretch',
          height: '100%',
        }}
      >
        <CardMedia
          component="img"
          image={getPosterUrl(movie.poster_path, 'w342')}
          alt={movie.title}
          loading="lazy"
          sx={{ aspectRatio: '2 / 3', objectFit: 'cover' }}
        />
        <CardContent sx={{ py: 1.5, flexGrow: 1 }}>
          <Typography
            variant="subtitle2"
            component="h3"
            sx={{
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden',
              minHeight: '2.6em',
              lineHeight: 1.3,
            }}
          >
            {movie.title}
          </Typography>
          <Stack direction="row" spacing={1} sx={{ mt: 1, alignItems: 'center' }}>
            {year ? (
              <Typography variant="caption" color="text.secondary">
                {year}
              </Typography>
            ) : null}
            {rating ? (
              <Chip
                size="small"
                label={rating}
                color="primary"
                variant="outlined"
                sx={{ height: 20, fontSize: 11 }}
              />
            ) : null}
          </Stack>
        </CardContent>
      </CardActionArea>
    </Card>
  )
}
