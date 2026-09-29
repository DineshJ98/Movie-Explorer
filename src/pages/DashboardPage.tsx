import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import SearchBar from '../components/SearchBar'
import EmptyState from '../components/movie/EmptyState'
import LoadMoreButton from '../components/movie/LoadMoreButton'
import MovieCard from '../components/movie/MovieCard'
import MovieGrid from '../components/movie/MovieGrid'
import { MovieCardSkeleton } from '../components/movie/MovieCardSkeleton'
import PageContainer from '../components/layout/PageContainer'
import { useMovies } from '../context/movieContextValue'

export default function DashboardPage() {
  const {
    movies,
    query,
    setQuery,
    isSearching,
    status,
    error,
    hasMore,
    isCapped,
    loadMore,
    retry,
  } = useMovies()

  const isInitialLoading = status === 'loading' && movies.length === 0
  const subtitle = isSearching
    ? `${movies.length} result${movies.length === 1 ? '' : 's'} for "${query.trim()}"`
    : 'Popular films this week'

  return (
    <PageContainer title="Trending" subtitle={subtitle}>
      <Box sx={{ maxWidth: 480, mb: 3 }}>
        <SearchBar value={query} onChange={setQuery} />
      </Box>

      {error ? (
        <Alert severity="error" sx={{ mb: 3 }}
          action={
            <Button color="inherit" size="small" onClick={retry}>
              Retry
            </Button>
          }
        >
          {error}
        </Alert>
      ) : null}

      {isInitialLoading ? (
        <MovieGrid>
          <MovieCardSkeleton count={12} />
        </MovieGrid>
      ) : movies.length === 0 && status === 'success' ? (
        <EmptyState
          title={isSearching ? 'No movies found' : 'Nothing to show'}
          message={
            isSearching
              ? 'Try a different search term.'
              : 'Trending films could not be loaded.'
          }
        />
      ) : (
        <>
          <MovieGrid>
            {movies.map((movie) => (
              <MovieCard key={movie.id} movie={movie} />
            ))}
          </MovieGrid>
          <LoadMoreButton
            hasMore={hasMore}
            isLoading={status === 'loading-more'}
            isCapped={isCapped}
            resultCount={movies.length}
            onLoadMore={loadMore}
          />
        </>
      )}
    </PageContainer>
  )
}
