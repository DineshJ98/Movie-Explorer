import Card from '@mui/material/Card'
import Skeleton from '@mui/material/Skeleton'

/**
 * One shimmer tile, shaped like a real MovieCard so the grid does not reflow
 * when real content replaces it.
 */
function SkeletonTile() {
  return (
    <Card sx={{ border: 'none', boxShadow: 'none' }}>
      <Skeleton variant="rectangular" animation="wave" sx={{ aspectRatio: '2 / 3' }} />
      <Skeleton width="85%" height={18} sx={{ mt: 1 }} />
      <Skeleton width="45%" height={14} />
    </Card>
  )
}

export function MovieCardSkeleton({ count = 12 }: { count?: number }) {
  return (
    <>
      {Array.from({ length: count }, (_, i) => (
        <SkeletonTile key={i} />
      ))}
    </>
  )
}
