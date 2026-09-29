import Box from '@mui/material/Box'
import Skeleton from '@mui/material/Skeleton'
import Stack from '@mui/material/Stack'

/**
 * Loading placeholder for the details page.
 *
 * Mirrors the real layout's dimensions (16:9 backdrop, 2:3 poster, fixed
 * height metadata block) so content arriving does not shift the page.
 */
export function DetailSkeleton() {
  return (
    <Stack spacing={3}>
      <Skeleton variant="rectangular" sx={{ aspectRatio: '16 / 9', width: '100%' }} />

      <Box
        sx={{
          display: 'grid',
          gap: 3,
          gridTemplateColumns: { xs: '1fr', md: '220px 1fr' },
          alignItems: 'start',
        }}
      >
        <Skeleton variant="rectangular" sx={{ aspectRatio: '2 / 3', width: '100%' }} />

        <Stack spacing={1.5}>
          <Skeleton variant="text" width="55%" height={44} />
          <Stack direction="row" spacing={1}>
            <Skeleton variant="rounded" width={90} height={32} />
            <Skeleton variant="rounded" width={110} height={32} />
            <Skeleton variant="rounded" width={80} height={32} />
          </Stack>
          <Skeleton variant="text" height={26} />
          <Skeleton variant="text" width="92%" />
          <Skeleton variant="text" width="88%" />
          <Skeleton variant="text" width="70%" />
        </Stack>
      </Box>
    </Stack>
  )
}
