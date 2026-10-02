# Movie Explorer

A React + TypeScript front end for browsing the [TMDB](https://www.themoviedb.org/) catalogue. Sign in with your TMDB account, browse trending films, search, and open a deep-linkable details page with cast and trailers.

Live: [movie-explorer-ruby-three.vercel.app](https://movie-explorer-ruby-three.vercel.app)

## Features

- **TMDB sign-in** via TMDB's request-token approval flow, with session restore across refreshes.
- **Trending dashboard** with paginated "load more", skeletons, and error retry.
- **Debounced search** across the catalogue.
- **Movie details** at `/dashboard/:id` — overview, cast, trailer. Works on hard refresh or a shared link.
- **Light/dark theme** applied before first paint (no flash).
- **Route protection** that restores the originally requested path after sign-in.

> **Status:** browsing, search, details, and auth are complete. `/favorites` is a placeholder and the "Add to favourites" button is disabled.

## Tech stack

React 19 · TypeScript · Vite 8 · react-router-dom 7 · MUI 9 · axios · Vercel

## Getting started

Needs **Node `^20.19.0` or `>=22.12.0`** and **pnpm**.

```bash
pnpm install
cp .env.example .env.local   # add your token, see below
pnpm dev
```

### Environment variables

One variable, used by both environments. Get a **v4 "API Read Access Token"** from TMDB → *Account settings → API* (not the old v3 API key).

| Variable | Required | Purpose |
| --- | --- | --- |
| `TMDB_TOKEN` | yes | The v4 read token. Server-side only — see below. |
| `VITE_TMDB_IMAGE_BASE` | no | Image CDN root. Falls back to `https://image.tmdb.org/t/p`. |
| `VITE_TMDB_API_ORIGIN` | no | Origin the dev proxy forwards to. Defaults to TMDB. |

`.env.local` is git-ignored. Never commit it.

### Local HTTPS (optional)

TMDB rejects approval redirects pointing at `localhost`, so sign-in fails on `http://localhost:5173`. To fix it, serve a locally-trusted certificate on a domain that resolves to loopback:

```bash
mkcert -install                                    # trust the CA (needs sudo)
mkcert -cert-file dev-cert.pem -key-file dev-key.pem \
  movie-explorer.localtest.me localhost 127.0.0.1 ::1
```

Then in `.env.local`:

```
DEV_HOST=movie-explorer.localtest.me
DEV_HTTPS_CERT=/path/to/dev-cert.pem
DEV_HTTPS_KEY=/path/to/dev-key.pem
```

`pnpm dev` will now print the URL to open. Without these the app still runs on plain HTTP, it just can't complete sign-in.

## Scripts

| Command | Description |
| --- | --- |
| `pnpm dev` | Dev server with the `/api/tmdb` proxy. |
| `pnpm build` | Type-check, then build to `dist/`. |
| `pnpm preview` | Serve the production build locally. |
| `pnpm lint` | ESLint. |

## How it talks to TMDB

The browser only ever calls `/api/tmdb/...`. Both environments inject the `Authorization` header server-side, so the token is never in the bundle and dev and prod behave identically.

```
dev:  browser ─▶ Vite proxy at /api/tmdb ─▶ https://api.themoviedb.org/3/...
prod: browser ─▶ Vercel function at /api/tmdb ─▶ https://api.themoviedb.org/3/...
```

Production uses one Vercel function per endpoint under `api/tmdb/`, all delegating to `server/tmdbProxy.js`. The allowlist is structural: the router can't build a route for a path nobody declared.

> **This is a real deployment trap.** Hardcoding a TMDB host, or relying on a dev-only proxy, works in development and fails once deployed. Don't "simplify" the base URL away.

`vercel.json` rewrites unmatched routes to `index.html` so deep links survive a hard refresh.

## Project structure

```
api/tmdb/    One Vercel function per TMDB endpoint
server/      Shared proxy logic
src/
  api/       TMDB client, services, auth calls
  components/ Presentational components
  context/   Auth, movie list, and theme providers
  hooks/     useDebounce, useMovieDetails
  pages/     One file per route
  routes/    Router config and ProtectedRoute
  types/     TMDB response and auth types
  utils/     Image URLs, formatting, storage
```

## Security notes

`vercel.json` sets a Content-Security-Policy plus `X-Content-Type-Options`, `Referrer-Policy`, and `Permissions-Policy`. The pre-paint theme script lives in `public/theme-init.js` rather than inline in `index.html` so `script-src` can stay `'self'` with no `'unsafe-inline'`.

- **The read token is server-side.** `TMDB_TOKEN` has no `VITE_` prefix, so Vite never inlines it and the browser cannot read it. A production build fails outright if a `VITE_TMDB_TOKEN` is present.
- **`session_id` is the real credential.** A write credential for the user's TMDB account, kept in `localStorage`. Anything running on the origin can read it — the accepted trade-off of a browser-only app, and why the CSP matters.

## Deployment

Pushes to `master` deploy through Vercel's GitHub integration.

1. Set **`TMDB_TOKEN`** in the Vercel project's environment variables (for each environment you deploy, including Preview).
2. Build command `pnpm build`, output `dist` — already set in `vercel.json`.

## Not yet built

- **Favorites** (`/favorites`) — placeholder page. Intended to sync to the TMDB account.
- **Favorites toggle** on details — present but disabled, no data source yet.

## Further reading

- [`CODE_REVIEW.md`](./CODE_REVIEW.md) — review of this branch: known issues and suggested fixes.
- [`Agent.MD`](./Agent.MD) — architectural decisions and reasoning.
- [`tasks.md`](./tasks.md) — phase-by-phase task tracker.