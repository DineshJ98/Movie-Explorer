import react from '@vitejs/plugin-react'
import { defineConfig, loadEnv } from 'vite'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')

  return {
    plugins: [react()],
    server: {
      proxy: {
        '/tmdb': {
          target: env.VITE_TMDB_API_ORIGIN ?? 'https://api.themoviedb.org',
          changeOrigin: true,
          secure: true,
          rewrite: (path) => path.replace(/^\/tmdb/, '/3'),
        },
      },
    },
  }
})
