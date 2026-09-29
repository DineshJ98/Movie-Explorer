import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { RouterProvider } from 'react-router-dom'
import './index.css'
import { AuthProvider } from './context/AuthContext'
import { AppThemeProvider } from './context/ThemeContext'
import router from './routes/AppRouter'

const container = document.getElementById('root')

if (container === null) {
  throw new Error('Root element #root not found in index.html')
}

createRoot(container).render(
  <StrictMode>
    <AppThemeProvider>
      {/* Outermost app provider: the router, ProtectedRoute and AppBar all read
          auth state. MovieProvider is mounted per-route in AppRouter instead, so
          no TMDB list request is made for anonymous visitors. */}
      <AuthProvider>
        <RouterProvider router={router} />
      </AuthProvider>
    </AppThemeProvider>
  </StrictMode>,
)
