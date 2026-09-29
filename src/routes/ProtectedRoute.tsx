import Box from '@mui/material/Box'
import CircularProgress from '@mui/material/CircularProgress'
import type { ReactNode } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/authContextValue'

/**
 * Gate for authenticated routes.
 *
 * While the session is being restored the route renders a spinner rather than
 * redirecting. Redirecting on 'loading' would bounce a signed-in user to /login
 * on every hard refresh, because the stored session has not been revalidated
 * yet at that instant.
 *
 * `state.from` lets the callback return the user to the page they actually
 * wanted. It is read by `LoginPage` and persisted across the tmdb.org round
 * trip; router state alone would not survive a full page navigation.
 */
export default function ProtectedRoute({ children }: { children: ReactNode }) {
  const { status } = useAuth()
  const location = useLocation()

  if (status === 'loading') {
    return (
      <Box
        sx={{
          display: 'grid',
          placeItems: 'center',
          minHeight: '60vh',
        }}
      >
        <CircularProgress aria-label="Restoring your session" />
      </Box>
    )
  }

  if (status === 'anonymous') {
    return <Navigate to="/login" state={{ from: location.pathname }} replace />
  }

  return <>{children}</>
}
