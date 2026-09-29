# Movie Explorer

A React + TypeScript front end for browsing the [TMDB](https://www.themoviedb.org/) catalogue. Sign in with your TMDB account, browse trending films, search, and open a deep-linkable details page with cast and trailers.

Built as a front-end-only app: no backend, no database, no server-side session store.

Live: [movie-explorer-ruby-three.vercel.app](https://movie-explorer-ruby-three.vercel.app)

## Features

- **TMDB sign-in** via TMDB's request-token approval flow, with session restore across refreshes and a proper signed-out state.
- **Trending dashboard** with paginated "load more", skeleton placeholders, and error retry.
- **Debounced search** across the TMDB catalogue.
- **Movie details** at `/dashboard/:id` — overview, cast, and a YouTube trailer, all working on a hard refresh or a shared link.
- **Light/dark theme** that applies before first paint (no flash).
- **Route protection** for authenticated pages, with the originally requested path restored after sign-in.

> **Status:** browsing, search, details, and auth are complete. `/favorites` is a placeholder, and the "Add to favourites" button is disabled — see [Not yet built](#not-yet-built).

## Tech stack

| | |
| --- | --- |
| Framework | React 19, TypeScript, Vite 8 |
| Routing | react-router-dom 7 |
| UI | Material UI 9 (MUI) with Emotion |
| HTTP | axios |
| Hosting | Vercel (static build + `vercel.json` headers) |

## Getting started

Requires **Node `^20.19.0` or `>=22.12.0`** (Vite 8's floor) and **pnpm**.

```bash
pnpm install
cp .env.example .env.local   # then add your token, see below
pnpm dev
```

The app runs at `http://localhost:5173`.

### Environment variables

Get a **v4 "API Read Access Token"** from TMDB → *Account settings → API*. This is **not** the old v3 API key.

| Variable | Required | Purpose |
| --- | --- | --- |
| `VITE_TMDB_TOKEN` | yes | The v4 read token, sent as an `Authorization: Bearer <token>` header. |
| `VITE_TMDB_IMAGE_BASE` | yes | Image CDN root, e.g. `https://image.tmdb.org/t/p`. **No fallback** — it is read at module load, so leaving it unset throws during startup and renders a blank page. |
| `VITE_TMDB_API_ORIGIN` | no | Origin the dev proxy forwards to. Defaults to `https://api.themoviedb.org`. |

`.env.local` is git-ignored. Never commit it.

## Scripts

| Command | Description |
| --- | --- |
| `pnpm dev` | Dev server with hot reload and the `/tmdb` API proxy. |
| `pnpm build` | Type-check, then build to `dist/`. |
| `pnpm preview` | Serve the production build locally. |
| `pnpm lint` | ESLint. |

## How it talks to TMDB

**Development** uses a Vite proxy so the browser talks to a same-origin path and never hardcodes an API host. `vite.config.ts` rewrites `/tmdb/*` to `https://api.themoviedb.org/3/*`, which also sidesteps CORS:

```
browser ──/tmdb/trending/movie/week──▶ Vite dev server ──/3/trending/movie/week──▶ TMDB
```

**Production** talks to TMDB directly, because that proxy only exists inside `pnpm dev` and does not ship in the built bundle. TMDB's CORS policy permits this.

> **This is a real deployment trap.** Hardcoding `/tmdb` as the base URL works perfectly in development and 404s on every request once deployed. `src/api/tmdbClient.ts` picks its base URL from `import.meta.env.DEV` for this reason. Don't "simplify" it back to a single path.

`vercel.json` also rewrites all unmatched routes to `index.html` so deep links like `/dashboard/550` survive a hard refresh. Without that rewrite they return a 404 page on refresh.

## Project structure

```
src/
  api/          TMDB client, service layer, auth calls
  components/   Presentational components (layout/, movie/)
  context/      Auth, movie list, and theme providers
  hooks/        useDebounce, useMovieDetails
  layouts/      AppLayout (app bar + outlet)
  pages/        One file per route
  routes/       Router config and ProtectedRoute
  types/        TMDB response and auth types
  utils/        Image URLs, formatting, storage
```

State lives in three providers. `AuthProvider` wraps the whole app; `MovieProvider` is mounted per-route in `AppRouter` so anonymous visitors on `/login` don't trigger a catalogue request.

## Security notes

`vercel.json` sets a Content-Security-Policy plus `X-Content-Type-Options`, `Referrer-Policy`, and `Permissions-Policy`. The pre-paint theme script lives in `public/theme-init.js` rather than inline in `index.html` so that `script-src` can stay `'self'` with no `'unsafe-inline'`.

**What is and isn't a secret here:**

- The **read token is public.** Anything `VITE_`-prefixed is inlined into the client bundle at build time, so `VITE_TMDB_TOKEN` is readable by anyone who views source. A v4 read token can only read public catalogue data — it cannot modify an account or read a watchlist. This is unavoidable for a front-end-only app, since the browser has to make the request.
- **`session_id` is the real credential.** It's a write credential for a user's TMDB account, and it is kept in `localStorage`. Anything running on the origin can read it. That's the accepted trade-off of a no-backend app, and it's why the CSP matters.

## Deployment

Pushes to `master` deploy through Vercel's GitHub integration.

1. Set `VITE_TMDB_TOKEN` in the Vercel project's environment variables.
2. Keep the build command as `pnpm build` with output directory `dist` (already set in `vercel.json`).

`VITE_`-prefixed variables are baked in at **build** time, so changing one requires a redeploy, not just a restart.

## Not yet built

Planned work, tracked in `tasks.md`:

- **Favorites** (`/favorites`) — currently a placeholder page. Intended to sync to the user's TMDB account rather than `localStorage`.
- **Favorites toggle** on the details page — present but disabled, since there's no data source to wire it to yet.

## Further reading

- [`Agent.MD`](./Agent.MD) — architectural decisions and the reasoning behind them, including verified API quirks and past bugs worth not reintroducing.
- [`tasks.md`](./tasks.md) — phase-by-phase task tracker and verification notes.
