import { readFileSync } from 'node:fs'
import type { AddressInfo } from 'node:net'
import type { Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import { defineConfig, loadEnv } from 'vite'

type TlsFiles = { cert: Buffer; key: Buffer }

/**
 * Local HTTPS exists because of a TMDB limitation, not a project preference.
 *
 * TMDB's edge blocks the approval POST whenever `redirect_to` points at
 * `localhost`:
 *
 *   POST https://www.themoviedb.org/authenticate/<token>/allow  ->  403 CloudFront
 *
 * TMDB staff confirm the block and recommend "a local resolvable domain" for dev.
 * A real hostname is only half the fix, though - the tunnel test showed plain
 * `http://localhost` failing while `https://<real-host>` succeeded, and TMDB's
 * docs ask for HTTPS, so this serves a locally-trusted certificate on a
 * local-resolving domain. Both variables are then satisfied at once.
 *
 * Opt-in, and per machine: cert paths live in the git-ignored `.env.local`, so a
 * fresh clone still runs plain HTTP on `localhost` until someone runs mkcert.
 */
function resolveDevTls(env: Record<string, string>): TlsFiles | null {
  const certPath = env.DEV_HTTPS_CERT
  const keyPath = env.DEV_HTTPS_KEY

  if (!certPath && !keyPath) return null

  // Half-configured is a typo, not a reason to silently fall back to HTTP. A
  // quiet downgrade would resurface as a baffling 403 from TMDB much later.
  if (!certPath || !keyPath) {
    throw new Error(
      'DEV_HTTPS_CERT and DEV_HTTPS_KEY must be set together. Set both in ' +
        '.env.local, or remove both to serve plain HTTP.',
    )
  }

  try {
    return { cert: readFileSync(certPath), key: readFileSync(keyPath) }
  } catch (cause) {
    throw new Error(
      `Could not read the local HTTPS certificate.\n` +
        `  cert: ${certPath}\n` +
        `  key:  ${keyPath}\n\n` +
        `Create it once with:\n` +
        `  mkcert -cert-file <dir>/dev-cert.pem -key-file <dir>/dev-key.pem \\\n` +
        `    movie-explorer.localtest.me localhost 127.0.0.1 ::1\n\n` +
        `Then trust the CA so the browser stops warning:\n` +
        `  mkcert -install   (needs sudo)\n\n` +
        `Underlying error: ${cause instanceof Error ? cause.message : String(cause)}`,
      { cause },
    )
  }
}

/**
 * Vite advertises `http://localhost:PORT` on startup, which is exactly the origin
 * TMDB refuses. Name the origin that actually works so it is not a guess.
 */
function devOriginNotice(publicHost: string): Plugin {
  return {
    name: 'dev-origin-notice',
    apply: 'serve',
    configureServer(server) {
      const address = server.httpServer?.address()
      const port = typeof address === 'object' && address ? (address as AddressInfo).port : null
      if (!port) return
      const scheme = server.config.server.https ? 'https' : 'http'
      server.config.logger.info(
        `\n  TMDB auth: open ${scheme}://${publicHost}:${port}/\n` +
          `  (TMDB rejects redirect_to on localhost)\n`,
      )
    },
  }
}

export default defineConfig(({ command, mode }) => {
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
        'VITE_-prefixed is inlined into the public bundle. Delete ' +
        'VITE_TMDB_TOKEN everywhere and use TMDB_TOKEN instead -- that one ' +
        'variable serves both the dev proxy and the deployed function.',
    )
  }

  // `command === 'build'` is exactly what Vercel runs. Returning `null` here
  // makes the certificate unreadable from a production build by construction,
  // rather than by remembering to keep the paths valid on CI. The deploy can
  // never depend on a local CA existing.
  const devTls = command === 'serve' ? resolveDevTls(env) : null
  // What you type in the browser. Deliberately NOT the bind address: resolving a
  // public wildcard domain at startup would make `pnpm dev` fail offline.
  const publicHost = env.DEV_HOST ?? '127.0.0.1'

  return {
    plugins: [react(), devOriginNotice(publicHost)],
    server: {
      // Loopback only. `true` would bind every interface and expose the dev
      // server to the LAN, which this app does not need. `movie-explorer.localtest.me`
      // resolves to loopback via public DNS, so browsers reach it on its A or AAAA record.
      host: env.DEV_BIND_HOST ?? '127.0.0.1',
      // Fail rather than silently move to 5174. The auth flow exchanges a session
      // between the origin that started it and the origin that receives the
      // callback, so drifting onto a different port mid-flow breaks sign-in in a
      // way that looks exactly like a TMDB problem. A loud port clash is better.
      strictPort: true,
      https: devTls ?? undefined,
      proxy: {
        // The same path the Vercel function answers on, so the client can use one
        // base URL in every environment instead of branching on DEV.
        //
        // The token is injected HERE, server-side, exactly as
        // `api/tmdb/[...path].js` does in production. That is what allows `.env.local`
        // to hold a single unprefixed `TMDB_TOKEN` instead of `VITE_TMDB_TOKEN`,
        // which in turn removes the conflict where the variable dev needs is the
        // same one `vite.config.ts` refuses to let a production build see.
        '/api/tmdb': {
          target: env.VITE_TMDB_API_ORIGIN ?? 'https://api.themoviedb.org',
          changeOrigin: true,
          secure: true,
          rewrite: (path) => path.replace(/^\/api\/tmdb/, '/3'),
          headers: env.TMDB_TOKEN ? { Authorization: `Bearer ${env.TMDB_TOKEN}` } : undefined,
        },
      },
    },
  }
})