import type { ReactNode } from 'react'

/**
 * Phase 1 stub: always renders children.
 *
 * Phase 5 replaces the body with an `isAuthenticated` check:
 *
 *   const { isAuthenticated } = useAuth()
 *   if (!isAuthenticated) {
 *     return <Navigate to="/login" state={{ from: location.pathname }} replace />
 *   }
 *
 * It is written as a component rather than an inline <Navigate> so that swap
 * is a one-file change and every consumer keeps the same import.
 */
export default function ProtectedRoute({ children }: { children: ReactNode }) {
  return <>{children}</>
}
