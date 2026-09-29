import { Navigate, createBrowserRouter } from 'react-router-dom'
import { MovieProvider } from '../context/MovieContext'
import AppLayout from '../layouts/AppLayout'
import AuthCallbackPage from '../pages/AuthCallbackPage'
import DashboardPage from '../pages/DashboardPage'
import FavoritesPage from '../pages/FavoritesPage'
import LoginPage from '../pages/LoginPage'
import MovieDetailsPage from '../pages/MovieDetailsPage'
import NotFoundPage from '../pages/NotFoundPage'
import ProtectedRoute from './ProtectedRoute'

const router = createBrowserRouter([
  {
    path: '/',
    element: <Navigate to="/dashboard" replace />,
  },
  {
    path: '/login',
    element: <LoginPage />,
  },
  {
    // Public: TMDB redirects here and it must work before any session exists.
    path: '/auth/callback',
    element: <AuthCallbackPage />,
  },
  {
    // MovieProvider is mounted here rather than in main.tsx so trending is
    // fetched only for signed-in users. At the top of the tree it would fire a
    // request on /login and /auth/callback too, where no list is ever shown.
    element: (
      <MovieProvider>
        <AppLayout />
      </MovieProvider>
    ),
    children: [
      {
        path: '/dashboard',
        element: (
          <ProtectedRoute>
            <DashboardPage />
          </ProtectedRoute>
        ),
      },
      {
        path: '/dashboard/:id',
        element: (
          <ProtectedRoute>
            <MovieDetailsPage />
          </ProtectedRoute>
        ),
      },
      {
        path: '/favorites',
        element: (
          <ProtectedRoute>
            <FavoritesPage />
          </ProtectedRoute>
        ),
      },
    ],
  },
  {
    path: '*',
    element: <NotFoundPage />,
  },
])

export default router
