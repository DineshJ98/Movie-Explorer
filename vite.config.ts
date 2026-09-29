import react from '@vitejs/plugin-react'
import { defineConfig, loadEnv } from 'vite'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')

  // The read token must never be available to a production build. `tmdbClient.ts`
  // reads it inside an `import.meta.env.DEV` branch, and esbuild happens to
  // eliminate that branch today, so the token is not in `dist/` even when the
  // variable is set. That is load-bearing but fragile: moving the read out of the
  // DEV branch, or a bundler upgrade changing the DCE behaviour, would silently
  // start shipping it again. Fail the build instead of discovering that in a
  // bundle diff.
  if (mode === 'production' && env.VITE_TMDB_TOKEN) {
    throw new Error(
      'VITE_TMDB_TOKEN is set for a production build. The token is injected ' +
        'server-side by api/tmdb/[...path].js from TMDB_TOKEN, and anything ' +
        'VITE_-prefixed is inlined into the public bundle. Remove ' +
        'VITE_TMDB_TOKEN from the production environment (keep it in .env.local ' +
        'for the dev proxy) and set TMDB_TOKEN instead.',
    )
  }

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
