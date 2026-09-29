import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { RouterProvider } from 'react-router-dom'
import './index.css'
import { MovieProvider } from './context/MovieContext'
import { AppThemeProvider } from './context/ThemeContext'
import router from './routes/AppRouter'

const container = document.getElementById('root')

if (container === null) {
  throw new Error('Root element #root not found in index.html')
}

createRoot(container).render(
  <StrictMode>
    <AppThemeProvider>
      <MovieProvider>
        <RouterProvider router={router} />
      </MovieProvider>
    </AppThemeProvider>
  </StrictMode>,
)
