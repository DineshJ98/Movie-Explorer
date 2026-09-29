import Button from '@mui/material/Button'
import MovieIcon from '@mui/icons-material/Movie'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'

interface EmptyStateProps {
  title: string
  message?: string
  actionLabel?: string
  onAction?: () => void
}

export default function EmptyState({
  title,
  message,
  actionLabel,
  onAction,
}: EmptyStateProps) {
  return (
    <Stack
      spacing={2}
      sx={{
        alignItems: 'center',
        textAlign: 'center',
        py: { xs: 6, md: 10 },
        px: 2,
      }}
    >
      <MovieIcon sx={{ fontSize: 48, color: 'text.disabled' }} />
      <Typography variant="h6" component="p">
        {title}
      </Typography>
      {message ? (
        <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 420 }}>
          {message}
        </Typography>
      ) : null}
      {actionLabel && onAction ? (
        <Button variant="contained" onClick={onAction}>
          {actionLabel}
        </Button>
      ) : null}
    </Stack>
  )
}
