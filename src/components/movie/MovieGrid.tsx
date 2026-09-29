import Box from '@mui/material/Box'
import type { ReactNode } from 'react'

/**
 * Fluid grid. `auto-fill` with a `clamp()` minimum means the column count is
 * derived from available width, so the same markup works from a 360px phone to
 * a 4K display with no breakpoint props.
 */
export default function MovieGrid({ children }: { children: ReactNode }) {
  return (
    <Box
      sx={{
        display: 'grid',
        gridTemplateColumns:
          'repeat(auto-fill, minmax(clamp(140px, 22vw, 220px), 1fr))',
        gap: { xs: 1.5, sm: 2 },
        alignItems: 'stretch',
      }}
    >
      {children}
    </Box>
  )
}
