# Movie Explorer — Task Tracker

Strategy: **Routing First → Page-by-Page → Auth Last**

Legend: `[ ]` pending · `[~]` in progress · `[x]` complete · `[-]` cancelled

> **Superseded requirement:** authentication is **no longer a local mock**. Phases 5 and 6 now use TMDB's native user database and real session pipeline. Details below.

---

## Project Status

| Field | Value |
|---|---|
| Current phase | Phase 0 — complete · Phase 1 — next |
| Last updated | 2026-09-29 |
| Build passing | Yes — `pnpm lint` and `pnpm build` both clean under strict mode |
| Auth model | **TMDB native accounts + session IDs** (replaces the local mock) |
| Blockers | **None.** API token verified working end to end. |

### Live API Verification (2026-09-29)

Token is valid and confirmed against the real API:

| Check | Result |
|---|---|
| `GET /trending/movie/week` | 200 — 10,000 results |
| Trending via Vite proxy (`/tmdb/*`) | 200 — proxy rewrite confirmed correct |
| Image base `w342` poster | 200 |
| `GET /authentication/token/new` | `success: true`, 40-char token issued |
| `POST /authentication/token/new` | **`success: false`** — this verb is wrong, use GET |

> The `token/new` verb discrepancy was caught by live testing, not documentation. TMDB's own reference page and its published OpenAPI spec both declare the route as GET; anyone following a third-party tutorial that uses POST will get a silent failure with no error message.

### Baseline Audit (verified 2026-09-29)

- Vite 8 + React 19.2 + TS ~6.0 scaffold committed; only `src/main.tsx` and `src/App.tsx` exist.
- No router, MUI, or Axios installed.
- `tsconfig.app.json` has **no `"strict": true`** — Vite template strict flag is missing. Must be added in Phase 0.
- `Agent.MD:13` mandates CRA + `REACT_APP_TMDB_TOKEN`, which contradicts the Vite mandate. **User instruction wins** — plan uses Vite and `VITE_TMDB_TOKEN`. `Agent.MD:13-17` and `Agent.MD:32` should be updated to remove the conflict.

### Target Structure

```
src/
  api/
    tmdbClient.ts            # axios instance, baseURL, bearer interceptor
    movieService.ts          # trending / search / details
    authService.ts           # request token -> approval -> session_id
    accountService.ts        # account details, favorites, watchlist
  types/
    tmdb.ts                  # explicit API payload interfaces
    tmdbAuth.ts              # TmdbRequestToken, TmdbSession, TmdbAccount
  context/
    ThemeContext.tsx         # light/dark mode + MUI palette bridge
    AuthContext.tsx          # account, sessionId, login, logout, restore
    MovieContext.tsx         # trending, search, loadMore
    FavoritesContext.tsx     # server-backed favorites, synced to TMDB
  hooks/
    useDebounce.ts
    useMovieDetails.ts
    useSessionStorage.ts
  routes/
    AppRouter.tsx
    ProtectedRoute.tsx
  layouts/AppLayout.tsx
  components/
    layout/AppBar.tsx  PageContainer.tsx  SearchBar.tsx  ThemeToggle.tsx
    movie/MovieCard.tsx  MovieGrid.tsx  MovieCardSkeleton.tsx
    movie/DetailSkeleton.tsx  FavoriteButton.tsx  CastList.tsx
    movie/LoadMoreButton.tsx  EmptyState.tsx  RemoveFavoriteDialog.tsx
  pages/
    LoginPage.tsx
    AuthCallbackPage.tsx     # NEW: /auth/callback landing for TMDB approval
    DashboardPage.tsx
    MovieDetailsPage.tsx
    FavoritesPage.tsx
    NotFoundPage.tsx
  utils/
    sessionStorage.ts
    imageUrl.ts
  theme/theme.ts
  vite-env.d.ts
```

---

## Phase 0 — Foundation (install + config, no features)

Files: `package.json`, `tsconfig.app.json`, `vite.config.ts`, `index.html`, `.env.local` *(new)*, `.env.example` *(new)*, `src/vite-env.d.ts` *(new)*, `src/main.tsx`, `src/index.css`

- [x] Add `"strict": true` plus `noUncheckedIndexedAccess` to `tsconfig.app.json:4` — the gate for every later phase.
- [x] Install runtime deps: `@mui/material @emotion/react @emotion/styled @mui/icons-material react-router-dom axios`.
- [-] Install dev deps: `typescript-axios` for `CancelToken` / `isCancel` typing. — **Dropped.** Axios 1.20 ships its own types with native `signal?: GenericAbortSignal` support, so the 0.x-era companion is unnecessary.
- [x] Set Vite dev proxy `/tmdb` → `https://api.themoviedb.org` in `vite.config.ts`, rewriting `/tmdb/*` → `/3/*`, to keep the token off the direct browser-to-TMDB path.
- [x] Create `.env.local` with the three `VITE_TMDB_*` vars. **Token left empty pending user input.**
- [x] Create `.env.example` with documented placeholders; add explicit `.env` / `.env.*` / `!.env.example` rules to `.gitignore`.
- [x] Extend `src/vite-env.d.ts` with an `ImportMetaEnv` interface for the three `VITE_TMDB_*` vars.
- [x] Set `<title>Movie Explorer</title>`, `<meta name="color-scheme" content="light dark">`, and a description meta in `index.html`.
- [x] Strip Vite demo CSS from `src/index.css`; replace with a reset that includes a `prefers-reduced-motion` guard. Delete `src/App.css`.
- [x] Delete unused `src/assets/{react,vite}.svg`, `src/assets/hero.png`, and `public/icons.svg`; stub `src/App.tsx` to a placeholder.

> **Value-add:** Only `VITE_`-prefixed vars are exposed by Vite; anything else is silently `undefined`. Typing them in `vite-env.d.ts` turns that class of bug into a compile error.

**Exit criteria:** `pnpm build` passes under strict mode; app boots with a blank themed page.

**Status: complete.** `pnpm lint` and `pnpm build` both clean. Proxy verified live — `curl localhost:5173/tmdb/trending/movie/week` returns **401** (TMDB rejecting the empty token), not 404, confirming the rewrite reaches the real API.

**Installed:** `@mui/material@9.4.0` `@mui/icons-material@9.4.0` `@emotion/react@11.14.0` `@emotion/styled@11.14.1` `react-router-dom@7.18.4` `axios@1.20.0`

> **Note:** pnpm resolved MUI **v9** and React Router **v7**, not the v5/v6 originally specced. The API surface this plan uses (`createBrowserRouter`, `Navigate`, `Outlet`, `ThemeProvider`, `CssBaseline`) is unchanged in both, so no plan amendment is needed.

---

## Phase 1 — Theme + routing skeleton (no data yet)

Files created: `src/theme/theme.ts`, `src/context/ThemeContext.tsx`, `src/components/ThemeToggle.tsx`, `src/routes/AppRouter.tsx`, `src/routes/ProtectedRoute.tsx`, `src/layouts/AppLayout.tsx`, `src/components/layout/AppBar.tsx`, `src/components/layout/PageContainer.tsx`, `src/pages/NotFoundPage.tsx`
Files modified: `src/main.tsx`

- [ ] Define `buildAppTheme(mode: 'light' | 'dark')` in `src/theme/theme.ts` returning a typed `Theme` with primary/secondary palette, `shape.borderRadius: 12`, and overrides for `Card`, `Button`, `Chip`.
- [ ] In `ThemeContext.tsx` hold `mode` and `toggleMode`, persist to `localStorage` under `me:theme`, default to `prefers-color-scheme` on first run.
- [ ] Create `AppLayout.tsx` with a persistent MUI `AppBar`, a `Container maxWidth="lg"` content slot, and an `Outlet` so all three authenticated pages share one chrome.
- [ ] Wire `AppRouter.tsx` with a `createBrowserRouter` tree: `/login` outside the layout; `/dashboard`, `/dashboard/:id`, `/favorites` inside it; catch-all `*` → `NotFoundPage`.
- [ ] Have `AppBar.tsx` render `NavLink` items for Dashboard and Favorites with `end` on Dashboard so it does not stay active on `/dashboard/:id`.
- [ ] Implement `ProtectedRoute.tsx` as a `<Navigate to="/login" state={{ from }} replace />` wrapper; stub it to always pass until Phase 6.
- [ ] Wrap the tree in `main.tsx:5` as `StrictMode > ThemeProvider > CssBaseline > AuthProvider > MovieProvider > RouterProvider` — MUI and Context must sit above the router so `ProtectedRoute` can read them.
- [ ] Set `scrollRestoration` in the router config so deep-linking to `/dashboard/603` lands at the top.

> **Value-add:** Nesting `/dashboard/:id` *inside* the layout (not as a sibling of `/dashboard`) means zero duplicated chrome while still being a standalone view — the spec's "standalone" requirement is satisfied by not nesting inside the grid page.

**Exit criteria:** All four routes reachable by URL, theme toggle works, layout renders shared chrome.

---

## Phase 2 — TMDB data layer (types → client → service)

Files created: `src/types/tmdb.ts`, `src/api/tmdbClient.ts`, `src/api/movieService.ts`, `src/utils/imageUrl.ts`

- [ ] Define `TmdbMovie`, `TmdbMovieDetail`, `TmdbPagedResponse<T>`, `TmdbGenre`, `TmdbCastMember`, `TmdbVideo`, `TmdbImageConfig` in `src/types/tmdb.ts` — every field optional except `id` and `title`, since TMDB omits fields silently and strict models otherwise crash on a null `poster_path`.
- [ ] Define `PagedResult<T> = { page: number; totalPages: number; totalResults: number; items: T[] }` as the app-level shape so pages never import the raw `TmdbPagedResponse`.
- [ ] Model the TMDB favorite-list item separately from `TmdbMovie`: it returns `genre_ids: number[]` instead of a `genres: TmdbGenre[]` object array, so reusing `TmdbMovie` will fail strict typing.
- [ ] Build `tmdbClient.ts` as a single `axios.create` with `baseURL: '/tmdb'`, a Bearer `Authorization` request interceptor, and a default `language: 'en-US'` param.
- [ ] Add a response interceptor normalizing `results: []` and coercing `total_pages: 0` so no page null-checks the envelope.
- [ ] Implement `getTrending(page)`, `searchMovies(query, page)`, `getMovieDetails(id)` in `movieService.ts`, each returning `PagedResult` or `TmdbMovieDetail` — no component imports Axios directly.
- [ ] Write `getPosterUrl(path, size)` in `src/utils/imageUrl.ts` with a `'w500'` default and a `null` path fallback so a missing poster renders a placeholder.
- [ ] Write typed `sessionStorage.ts` helpers `readJson<T>(key, fallback)`, `writeJson(key, value)`, `removeKey(key)`, each wrapped in try/catch for the Safari private-mode quota throw.
- [ ] Add a response interceptor that flags `401` distinctly so the auth layer can trigger re-login instead of the UI showing a generic failure.
- [ ] **Do not build `authService` or `accountService` here** — they depend on types settled in Phase 5 and are scoped there.

> **Value-add:** The service layer returning a normalized `PagedResult` means grid, favorites, and search consume one shape. When TMDB renames a field you change one mapper, not four components.

**Exit criteria:** A temporary console call returns a typed, correctly-shaped trending payload.

---

## Phase 3 — `/dashboard` trending + dynamic search

Files created: `src/context/MovieContext.tsx`, `src/hooks/useDebounce.ts`, `src/pages/DashboardPage.tsx`, `src/components/movie/MovieGrid.tsx`, `src/components/movie/MovieCard.tsx`, `src/components/movie/MovieCardSkeleton.tsx`, `src/components/movie/LoadMoreButton.tsx`, `src/components/movie/EmptyState.tsx`, `src/components/SearchBar.tsx`

- [ ] Implement `useDebounce<T>(value, delay = 400)` returning the debounced value and clearing its timer on unmount.
- [ ] Put `trending`, `searchResults`, `query`, `setQuery`, `page`, `hasMore`, `status`, `error`, `loadMore`, `retry` in `MovieContext` — the page holds no fetching state of its own. Favorites deliberately live in a separate `FavoritesContext` (Phase 6) so account state and catalog state do not couple.
- [ ] Model `status` as a discriminated union `'idle' | 'loading' | 'loading-more' | 'success' | 'error'` so `loading-more` renders a spinner without unmounting the grid.
- [ ] Switch to `searchResults` only when the debounced trimmed query length is ≥ 2; a 1-character query must not fire a request.
- [ ] Abandon stale responses with a monotonically increasing request ID in a ref so a slow earlier search cannot overwrite a faster later one.
- [ ] Cancel in-flight Axios requests on unmount and on query change via an `AbortController` signal passed through the service signature.
- [ ] Build `MovieCard.tsx` as a `Card` with `CardMedia` at `w342`, title clamped to 2 lines, release year, average-vote chip, wrapped in a `Link` to `/dashboard/${movie.id}`.
- [ ] Build `MovieCardSkeleton.tsx` as an `aspectRatio: '2/3'` MUI `Skeleton` shimmer, rendering 12 on first load to avoid layout shift.
- [ ] Make `MovieGrid.tsx` responsive via `repeat(auto-fill, minmax(clamp(140px, 22vw, 220px), 1fr))` so it needs no breakpoint props.
- [ ] Add `SearchBar.tsx` as a debounced `TextField` with a `startAdornment` search icon and a clear button that resets to trending.
- [ ] Render `EmptyState.tsx` on a zero-result search and a distinct message when trending itself fails, both with `retry`.
- [ ] Implement `LoadMoreButton.tsx` as a full-width outlined button gated on `hasMore && status !== 'loading-more'`, per the Agent.MD pagination trade-off.

> **Value-add:** Debounce the *query* (in context), not the *results* (in the page). Debouncing at the consumer level is the classic mistake that still lets a fast typist fire six requests.

**Exit criteria:** Trending grid loads, search swaps results, Load More appends, skeletons show during fetch, no stale-response overwrite.

---

## Phase 4 — `/dashboard/:id` deep-link details

Files created: `src/hooks/useMovieDetails.ts`, `src/pages/MovieDetailsPage.tsx`, `src/components/movie/DetailSkeleton.tsx`, `src/components/movie/FavoriteButton.tsx`, `src/components/movie/CastList.tsx`

> `FavoriteButton` ships in this phase as a **presentational stub** with no click handler. Its data source (`FavoritesContext`) does not exist until Phase 6, so wiring it here would be building against an unwritten API.

- [ ] Implement `useMovieDetails(id)` with a `'loading' | 'success' | 'error'` union, an `AbortController` tied to the `id` param, and retry on error.
- [ ] Call `/movie/${id}?append_to_response=credits,videos` in one round trip so cast and trailer arrive with the main payload instead of a second waterfall request.
- [ ] Validate `id` in `MovieDetailsPage` with `Number.isInteger` and render `EmptyState` on a non-numeric param instead of firing the service.
- [ ] Build a two-column `Grid` — backdrop on top, poster and metadata card below on `md`+; stacked on mobile — using a 16:9 backdrop and `w342` poster.
- [ ] Render title, release year, runtime formatted from `runtime` minutes, genres as `Chip`s, and `overview` with a "Read more" collapse past 4 lines.
- [ ] Show a YouTube trailer via `videos.results.find(v => v.site === 'YouTube' && v.type === 'Trailer')` in a responsive aspect-ratio `Box`, falling back to the backdrop when absent.
- [ ] Build `CastList.tsx` as a horizontally scrolling `Stack` of circular profile images, limited to 12 with an overflow count label.
- [ ] Guard invalid `vote_average` so a 0.0 rating displays as "Not rated" rather than a misleading zero.
- [ ] Make the page work on a cold deep link with zero context state by fetching entirely from the `id` param — no reliance on a previously-loaded list.

> **Value-add:** Fetching purely from the URL param is what makes the route a true deep link. Reading from a list cache breaks on refresh and on shared links — the most common review finding on this kind of build.

**Exit criteria:** Cold deep link to `/dashboard/550` renders fully after a hard refresh.

---

## Phase 5 — TMDB session auth (promoted ahead of favorites)

> **Why this moved up.** Favorites are now backed by TMDB's account API, and every `/account/*` call needs both a `session_id` and an `account_id`. Building favorites before auth is impossible, so the phase order is inverted. Auth-last as a *sequencing* rule is preserved for everything else.

Files created: `src/types/tmdbAuth.ts`, `src/api/authService.ts`, `src/context/AuthContext.tsx`, `src/pages/LoginPage.tsx`, `src/pages/AuthCallbackPage.tsx`, `src/hooks/useSessionStorage.ts`, `src/utils/sessionStorage.ts`
Files modified: `src/routes/AppRouter.tsx`, `src/routes/ProtectedRoute.tsx`, `src/components/layout/AppBar.tsx`

**Flow (password-free redirect, per TMDB's own recommendation):**

```
GET /authentication/token/new            -> request_token
        |
        v
window.location = https://www.themoviedb.org/authenticate/{request_token}?redirect_to={origin}/auth/callback
        |
        v  user approves on tmdb.org
GET /authentication/session/new          -> session_id
        |
        v
GET /account?session_id=...              -> { id, username, name, avatar, include_adult }
```

- [ ] Define `TmdbRequestToken`, `TmdbSessionResponse`, `TmdbAccount`, `TmdbAvatar`, and `TmdbActionResult` in `src/types/tmdbAuth.ts`, matching the exact JSON shapes TMDB returns.
- [ ] Implement `createRequestToken()` calling `GET /authentication/token/new` and extract the `request_token` string. **Use GET, not POST** — verified live: POST returns `{ "success": false }` with no token, GET returns a valid 40-char token. TMDB's reference page and its own OpenAPI spec both declare this route as GET.
- [ ] Build the approval URL as `https://www.themoviedb.org/authenticate/{request_token}?redirect_to={encodeURIComponent(origin + '/auth/callback')}` using `window.location.origin` so it works on any host.
- [ ] Implement `createSession(requestToken)` calling `POST /authentication/session/new` with `{ request_token }` in the **body**.
- [ ] Resolve the account via `GET /account?session_id=...` to obtain `id` and `username`; never hardcode or store an `account_id` in app state as a source of truth.
- [ ] Implement `deleteSession(sessionId)` as `DELETE /authentication/session?session_id=...` — **as a query param, not a body.** TMDB returns 405 for the body form despite its own docs showing one.
- [ ] Persist only `{ session_id, account_id, username, avatar_path, saved_at }` under `me:session` via `src/utils/sessionStorage.ts`; never store the password or the raw approval token.
- [ ] Expose `account`, `sessionId`, `status: 'loading' | 'authenticated' | 'anonymous'`, `beginLogin()`, `completeLogin(requestToken)`, and `logout()` from `AuthContext`.
- [ ] Gate app rendering behind `status !== 'loading'` so a hard refresh on a protected route does not flash `/login` before the session is restored.
- [ ] Build `LoginPage.tsx` as a single "Sign in with TMDB" `Button` plus an explanatory `Alert` — the password-free flow means **no username or password field is rendered at all**.
- [ ] Handle TMDB denial at the callback with a readable error state and a link back to `/login`; the user may close the tab or reject, and the app must survive both.
- [ ] Add `/auth/callback` as a route rendering `AuthCallbackPage`, which reads `request_token` from the query string, calls `completeLogin`, then `navigate(from ?? '/dashboard', { replace: true })`.
- [ ] Enforce `ProtectedRoute.tsx` to redirect to `/login` with `state={{ from: location.pathname }}` when `status === 'anonymous'`.
- [ ] Make `logout()` call `deleteSession` server-side before clearing local state, so the TMDB session is actually invalidated and not just hidden.
- [ ] Render the account avatar and `username` in `AppBar` with a `Menu` and `ListItemIcon` logout.
- [ ] Document on the login page that a TMDB account is required and that favorites sync to that account across devices — the opposite of the old device-scoped localStorage behavior.

> **Value-add:** A TMDB `session_id` is a **write credential** for a real account. Treat it like a password: keep it out of logs and out of any analytics payload, and always destroy it server-side on logout. Do not present this flow as production-grade security — a client-side SPA cannot keep a secret from the user it is authenticating.

> **Value-add:** `validate_with_login` (collecting username + password in the app) is marked *strongly discouraged* in TMDB's own documentation, because it pushes a real account password through your frontend. The redirect flow above avoids handling the password entirely. Do not switch to it to "simplify" the build.

**Exit criteria:** Approval round-trip works, session restores on refresh, logout invalidates server-side, no password field exists anywhere in the codebase.

---

## Phase 6 — `/favorites` synced to the TMDB account

> Rebuilt from the old localStorage design. Favorites are now remote, account-scoped, and survive across devices.

Files created: `src/api/accountService.ts`, `src/context/FavoritesContext.tsx`, `src/pages/FavoritesPage.tsx`, `src/components/movie/RemoveFavoriteDialog.tsx`
Files modified: `src/components/movie/MovieCard.tsx`, `src/components/movie/FavoriteButton.tsx`

- [ ] Define `TmdbStatusResult` and the add/remove request bodies in `src/api/accountService.ts` — `POST /account/{account_id}/favorite` takes `{ media_type: 'movie', media_id, favorite }`.
- [ ] Note the **asymmetric paths**: writes go to `/account/{id}/favorite`, but reads come from `/account/{id}/favorite/movies`. Do not add the `/movies` suffix to the write call.
- [ ] Send `session_id` as a **query param** on every `/account/*` call, alongside the bearer header — the account endpoints do not read it from the body.
- [ ] Implement `getFavorites(page)` against `GET /account/{account_id}/favorite/movies?session_id=...&sort_by=created_at.desc`, returning the standard `PagedResult<TmdbMovie>`.
- [ ] Implement `addFavorite(movieId)` and `removeFavorite(movieId)` against `POST /account/{account_id}/favorite` with `favorite: true | false` respectively.
- [ ] Expose `favorites`, `favoriteIds`, `isFavorite(id)`, `toggleFavorite(movie)`, `status`, and `error` from `FavoritesContext` — the card and details-page button both read this single source of truth.
- [ ] Maintain a `Set<number>` of favorite ids memoized from the list so `isFavorite` is an O(1) lookup rather than a linear scan on every card render.
- [ ] Fetch the favorites list on mount, and re-fetch on `account.id` change so switching accounts never shows stale data.
- [ ] Implement `toggleFavorite` as **optimistic with rollback**: apply the local state change immediately, and revert it if the API call rejects. TMDB writes have real latency and a naive await makes the heart feel broken.
- [ ] Track a per-movie `pendingIds` set so a rapid double-click on the heart issues one write rather than two, and disable the button only for that movie.
- [ ] Detect a `401` from any account call and surface an `Alert` prompting re-authentication, invalidating the stored session rather than looping retries.
- [ ] Build `FavoritesPage.tsx` reusing `MovieGrid` for visual parity with the dashboard, with the account-scoped count in the subtitle and a `LoadMoreButton` on the TMDB pagination cursor.
- [ ] Render an `EmptyState` with a "Browse trending" `Button` when the list is empty.
- [ ] Gate bulk removal behind `RemoveFavoriteDialog`; since TMDB has no bulk-clear endpoint, implement clear-all as a sequential loop with progress feedback rather than a single silent call.
- [ ] Surface a `LinearProgress` bar while the initial favorites list loads, rather than the grid skeleton, to distinguish it from the dashboard's own loading state.

> **Value-add:** Because favorites are now server-backed, the "device-scoped, not account-scoped" caveat from the old design is **gone** — and with it the need for a localStorage mirror. A local cache is still worth keeping for an offline read path, but it must be treated as a cache, not the source of truth, or logout will leak the previous account's favorites to the next user of the same browser.

**Exit criteria:** Favorite toggles from a card and from the details page, both persist to the TMDB account, list reflects a change made on another device, no stale state across account switches.

---

## Phase 7 — Hardening and verification

Files modified: `README.md`, `src/main.tsx`, `index.html`, `vite.config.ts`

- [ ] Run `pnpm lint` and `pnpm build` after *every* phase, not just the last — `tsc -b` in the build script is the strict-mode gate.
- [ ] Add `<meta name="description">` and an Open Graph tag in `index.html`.
- [ ] Verify the `dist/` output with `pnpm preview` and confirm no token leaks into the bundle beyond the unavoidable client-side env var.
- [ ] Test a cold hard refresh directly on `/dashboard/550` and `/favorites` to confirm both hydrate without a redirect loop.
- [ ] Test the light/dark toggle across all four pages and on both the `MovieCard` and `MovieDetailsPage` surfaces.
- [ ] Check the responsive grid at 360 px, 768 px, and 1440 px widths with no horizontal scrollbar.
- [ ] Confirm TMDB image-rate-limit backdrops render a placeholder rather than a 429 image in the dev console.
- [ ] Document setup steps, env vars, the TMDB account requirement, and the redirect-flow auth model in `README.md`.
- [ ] Confirm no `session_id` is ever written to `console.log`, an error toast, or an analytics payload.
- [ ] Verify logout actually destroys the session server-side by reloading after logout and confirming `/account?session_id=...` returns 401.
- [ ] Confirm a `401` from any account call forces re-auth instead of an infinite retry loop.
- [ ] Test that logging out and logging in as a different TMDB account does not show the first account's favorites.

**Exit criteria:** `pnpm lint` and `pnpm build` both clean; all manual checks above pass.

---

## Cross-Cutting Decisions (locked)

| Decision | Rationale |
|---|---|
| Service layer owns all Axios | Components never import Axios; swapping TMDB touches one file |
| `status` as a discriminated union | Makes "load more" spinner distinct from full-grid loading |
| Debounce in context, not component | Prevents per-component request storms |
| `AbortController` on every request | No state updates after unmount, no stale-response overwrite |
| Service returns `PagedResult<T>` | Grid, search, and favorites share one response shape |
| Auth uses the TMDB redirect flow, not password entry | TMDB explicitly discourages `validate_with_login`; the app never touches a real password |
| `session_id` always a query param, never a body | The body form of `DELETE /authentication/session` returns 405 |
| `account_id` resolved from `/account`, never hardcoded | Survives account switching without a code change |
| Remote favorites are the source of truth | localStorage is a cache only, so it cannot leak across accounts |
| Optimistic writes with rollback | TMDB account writes have real latency; awaiting them makes the UI feel broken |
| Deep link fetches from the `id` param only | Survives refresh and shared links |

---

## Open Questions

- [x] ~~TMDB v4 read access token~~ — **resolved.** Written to `.env.local` and verified working against the live API (see verification table above). Note this token is now present in the session transcript; rotate it in TMDB account settings if that transcript is shared or stored anywhere.
- [ ] ~~Mock login credentials~~ — **removed.** Authentication now uses real TMDB accounts; there are no local credentials to define.
- [ ] **New route `/auth/callback` is required** by the TMDB approval redirect and is not in the original four-route spec. Proceeding with it added; say so if the spec must stay at exactly four.
- [x] ~~Router version~~ — resolved: pnpm installed **v7**. API surface used by this plan is identical to v6.
- [x] ~~`typescript-axios`~~ — resolved: dropped, Axios 1.20 has native types.
- [x] ~~`Agent.MD` CRA conflict~~ — resolved, but **`Agent.MD` still describes mock auth and needs a second pass** to match the TMDB session pipeline.
- [ ] Should the account avatar `gravatar` hash be used as a fallback when `tmdb.avatar_path` is null? TMDB returns null fairly often.
