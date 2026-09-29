import Button from '@mui/material/Button'
import CircularProgress from '@mui/material/CircularProgress'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'

interface LoadMoreButtonProps {
  hasMore: boolean
  isLoading: boolean
  isCapped: boolean
  resultCount: number
  onLoadMore: () => void
}

export default function LoadMoreButton({
  hasMore,
  isLoading,
  isCapped,
  resultCount,
  onLoadMore,
}: LoadMoreButtonProps) {
  if (resultCount === 0) return null

  if (!hasMore && !isLoading && isCapped) {
    return (
      <Typography
        variant="body2"
        color="text.secondary"
        sx={{ textAlign: 'center', py: 4 }}
      >
        End of results
      </Typography>
    )
  }

  if (!hasMore) return null

  return (
    <Stack sx={{ alignItems: 'center', py: 3 }}>
      <Button
        variant="outlined"
        onClick={onLoadMore}
        disabled={isLoading}
        startIcon={isLoading ? <CircularProgress size={16} /> : undefined}
        sx={{ minWidth: 180 }}
      >
        {isLoading ? 'Loading' : 'Load more'}
      </Button>
    </Stack>
  )
}
