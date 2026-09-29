# Movie Explorer — Task Tracker

Strategy: **Routing First → Page-by-Page → Auth Last**

Legend: `[ ]` pending · `[~]` in progress · `[x]` complete · `[-]` cancelled

## Where We Are

Phases 0 through 3 are complete and verified. **`/dashboard` now renders real
trending films with live TMDB posters.** Search, debounce, and Load More are built.
**Phase 4 (`/dashboard/:id` details) is next** — it is the last page before auth.

Still placeholders: `MovieDetailsPage` and `FavoritesPage`. Clicking a card today
lands on a details page that shows only the movie id.

```
Phase 0  Foundation .................. DONE
Phase 1  Theme + routing skeleton .... DONE
Phase 2  TMDB data layer ............. DONE
Phase 3  /dashboard trending+search ... DONE
Phase 4  /dashboard/:id details ...... NEXT      <- start here
Phase 5  TMDB session auth ........... pending
Phase 6  /favorites, account-backed .. pending
Phase 7  Hardening + verification .... pending
```

**Before starting Phase 2**, read the *API Findings* table in Phase 1 below. Six
behavior changes in MUI v9, React Router v7, and TMDB were found by running the
installed code rather than reading docs. Several fail silently.

> **Superseded requirement:** authentication is **no longer a local mock**. Phases 5 and 6 now use TMDB's native user database and real session pipeline. Details below.

---

## Project Status

| Field | Value |
|---|---|
| Current phase | **Phase 3 — COMPLETE** |
| Last updated | 2026-09-29 (P3 closed) |
| Build passing | Yes — `tsc`, `pnpm lint`, and `pnpm build` all clean |
| Next up | Phase 4 (`/dashboard/:id` details) |
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

Files created: `src/theme/theme.ts`, `src/context/ThemeContext.tsx`, `src/context/themeContextValue.ts`, `src/utils/storage.ts`, `src/components/ThemeToggle.tsx`, `src/components/layout/AppBar.tsx`, `src/components/layout/PageContainer.tsx`, `src/layouts/AppLayout.tsx`, `src/routes/AppRouter.tsx`, `src/routes/ProtectedRoute.tsx`, `src/pages/{Dashboard,MovieDetails,Favorites,Login,NotFound}Page.tsx`
Files modified: `src/main.tsx`, `index.html`
Files deleted: `src/App.tsx` (replaced by the router)

- [x] Define `buildAppTheme(mode: ColorMode): Theme` in `src/theme/theme.ts` — a single factory returning a fully typed theme per mode.
- [x] Set `cssVariables: true` explicitly. **Verified necessary** — without it `theme.vars` is `undefined` (see API findings below).
- [x] Use two separate themes via a `mode` argument, not MUI's dual-mode `colorSchemes`. **Verified necessary** — dual-mode leaves `theme.palette.mode` stuck at `'light'` regardless of active mode.
- [x] Neutral grey surfaces with a **single blue accent** (`#1d6fe0` light, `#64a0f5` dark). No secondary hue — a second accent competes on a dense grid.
- [x] Verify contrast ratios rather than assume. Measured: 4.77 light / 6.44 dark primary-on-surface, both pass WCAG AA.
- [x] `AppBar` set to `position="sticky"` and `color="default"` — v9 defaults are `fixed` and `primary`, both of which break the design.
- [x] Nav uses `contained` for the active item, so active state is a filled blue button rather than blue text alone.
- [x] **Dark mode confirmed visually by the user** in a browser. Node-level verification had already shown the two themes emit different tokens; the interactive round-trip is now closed.

### Verified in browser (headless Chrome, live dev server)

| Route | Renders |
|---|---|
| `/` | redirects to `/dashboard` |
| `/dashboard` | AppBar + wordmark + nav + "Trending" h1 |
| `/dashboard/550` | "Movie #550" — param read from URL |
| `/favorites` | "Favorites" + browse button |
| `/login` | "Sign in to Movie Explorer" |
| `*` | 404 with recovery link |

Confirmed present on `/dashboard`: `<header>`, brand wordmark, both nav buttons, theme toggle with `aria-label`, `MuiButton-contained` on the active item, and the pre-paint `data-theme="light"` attribute on `<html>`. Emitted CSS variables: `--mui-palette-background-default: #f5f6f8`, `--mui-palette-primary-main: #1d6fe0`.

> **Known gap, tracked for Phase 7:** on `/dashboard/:id` the nav compares `pathname === '/dashboard'`, so **no nav item is highlighted** on a detail page. Intentional for now, not yet decided.

> **Value-add:** the pre-paint script in `index.html` is a hand-rolled replacement for MUI's `getInitColorSchemeScript`, which we gave up by making our own context own the mode. It reads the same `movieexplorer:theme` key. That key is now hardcoded in two places — if it changes, both must be updated.

---

## API Findings (verified against the installed packages, not documentation)

These were all discovered by running the installed code. Each would have produced a **silently wrong** result — a green build, no error, incorrect behavior.

| Finding | Impact if missed |
|---|---|
| `theme.vars` is `undefined` unless `cssVariables: true` is set explicitly. It is **not** a v9 default. | Every `theme.vars.*` override silently falls back to defaults. Green build, wrong colors. |
| Dual-mode `colorSchemes` leaves `theme.palette.mode` stuck at `'light'`. Correct mode is only reachable via `useColorScheme()`. | Any `palette.mode === 'dark'` check is wrong. Costs eleven components if caught late. |
| `Stack` no longer accepts flexbox props directly — `alignItems`, `justifyContent`, `flexGrow` must move to `sx`. | `tsc` error in every file using `Stack`. Caught immediately by strict mode. |
| `AppBar` defaults to `position: 'fixed'` and `color: 'primary'`. | A fixed bar overlays the first 56px of every page; a primary bar paints the whole header blue. |
| Exporting a hook from a component file breaks `react-refresh`. | Lint error; hot reload silently degrades to full reloads. Fixed by splitting `themeContextValue.ts`. |
| `POST /authentication/token/new` returns `{ success: false }` — must be **GET**. | Silent auth failure with no error message. Recorded in Phase 5. |

> The `colorSchemes` and `cssVariables` findings were both stated incorrectly in the original plan and in an earlier `Agent.MD` draft, based on recollection rather than reading the package. **Verify against the installed version before trusting any API claim in this document.**

**Exit criteria:** all four routes reachable by URL, theme toggle works, layout renders shared chrome. **All met.** Dark mode confirmed visually in a browser.

---

## Phase 2 — TMDB data layer (types → client → service)

Files created: `src/types/tmdb.ts`, `src/types/pagination.ts`, `src/api/tmdbClient.ts`, `src/api/movieService.ts`, `src/utils/imageUrl.ts`

- [x] Define `TmdbMovie`, `TmdbMovieDetail`, `TmdbPagedResponse<T>`, `TmdbGenre`, `TmdbCastMember`, `TmdbCrewMember`, `TmdbVideo`, `TmdbProductionCompany`, `TmdbCredits` — every field optional except `id` and `title`, since TMDB omits fields rather than sending nulls.
- [x] Define `PagedResult<T> = { page, totalPages, totalResults, items, hasMore }` in `src/types/pagination.ts` so no page imports the raw TMDB envelope.
- [x] Add a **separate** `TmdbMovieListResponse` type rather than reusing the detail type for list endpoints — list items carry `genre_ids: number[]` where the detail endpoint carries `genres: TmdbGenre[]`, so one shared type fails strict checking.
- [x] Build `tmdbClient.ts` as a single `axios.create` with `baseURL: '/tmdb'`, a 15s timeout, a default `language: 'en-US'` param, and a Bearer `Authorization` request interceptor.
- [x] Warn once at module load when `VITE_TMDB_TOKEN` is absent, so an empty token produces a named failure instead of a confusing 401.
- [x] Tag 401/403 as `TMDB_UNAUTHORIZED`, 404 as `TMDB_NOT_FOUND`, and a missing token as `TMDB_MISSING_TOKEN` in the response interceptor so callers branch on a constant rather than string-matching a message.
- [x] Implement `getTrending(page)`, `searchMovies(query, page)`, and `getMovieDetails(id)` — each accepting an optional `AbortSignal` so callers can cancel.
- [x] `getMovieDetails` requests `append_to_response=credits,videos` in a single round trip so cast and trailers arrive with the main payload rather than as a second waterfall.
- [x] Write `getImageUrl` returning `null` for a missing path, plus `getPosterUrl` (with a placeholder fallback), `getBackdropUrl`, and `getAvatarUrl`.

### Verified against the live API (real client, real dev server)

| Call | Result |
|---|---|
| `getTrending(1)` | 20 items, 500 pages, `hasMore: true` |
| `getTrending(20)` | 20 items, `hasMore: true` |
| `searchMovies('zzzzqqqxx')` | 0 items, `totalResults: 0`, **`totalPages: 1`**, `hasMore: false` |
| `searchMovies('bat')` | 20 items, first = `Bat★21` |
| `getMovieDetails(550)` | Fight Club, runtime 139, 2 genres, 76 cast, 3 YouTube trailers |
| `getMovieDetails(999999999)` | throws `TMDB_NOT_FOUND`, HTTP 404 |
| `getPosterUrl(path)` | `https://image.tmdb.org/t/p/w342/39aMkR8Y5vhCG9dTkjiqRl8AVqp.jpg` |
| `getImageUrl(null)` | `null` |

> **The empty-search envelope is the reason `hasMore` is computed, not read.** TMDB returns `total_pages: 1` for a search with zero results. A naive `page < total_pages` reports "there is more" when there is nothing, and the Load More button would spin forever. The guard is `items.length > 0 && page < totalPages`.

> **Trending reports 500 pages.** "Load More" is therefore effectively unbounded — 500 clicks would all succeed. Phase 3 should cap the dashboard at a sane limit and show an end-of-list message rather than letting the user scroll forever. Recorded in the Phase 3 checklist.

**Exit criteria:** a temporary probe page exercised all three services against the live API and asserted the envelope edge cases. **Met.** The probe was removed after verification and is not part of the app.

---

## Phase 3 — `/dashboard` trending + dynamic search

Files created: `src/hooks/useDebounce.ts`, `src/context/movieContextValue.ts`, `src/context/MovieContext.tsx`, `src/components/SearchBar.tsx`, `src/components/movie/MovieCard.tsx`, `src/components/movie/MovieCardSkeleton.tsx`, `src/components/movie/MovieGrid.tsx`, `src/components/movie/EmptyState.tsx`, `src/components/movie/LoadMoreButton.tsx`
Files modified: `src/pages/DashboardPage.tsx`, `src/main.tsx`

- [x] Implement `useDebounce<T>(value, delay = 400)` clearing its timer on unmount.
- [x] Split the context and its hook into `movieContextValue.ts` and `MovieContext.tsx` — required by the `react-refresh` rule, same reason the theme context is split.
- [x] Model `status` as the union `'loading' | 'loading-more' | 'success' | 'error'`, so a "load more" spinner is distinct from a first-page load.
- [x] Switch to search results only when the trimmed query is **2+ characters**.
- [x] Guard against stale responses with a monotonic `requestIdRef`; a late reply cannot overwrite a fresher one.
- [x] Abort in-flight requests on new query, on load-more, and on unmount via `AbortController`.
- [x] Discard results whose `term` no longer matches the active query (`isFresh`), so the previous search never shows under the new one.
- [x] **Cap paging at 10 pages** and render "End of results" beyond it — trending reports 500 pages.
- [x] `MovieCard` links to `/dashboard/${movie.id}`, clamps the title to 2 lines, shows year and a rating chip, and renders as an `<a>` via `RouterLink`.
- [x] `MovieCardSkeleton` renders 12 `aspectRatio: '2/3'` shimmer tiles so the grid does not reflow when content arrives.
- [x] `MovieGrid` uses `repeat(auto-fill, minmax(clamp(140px, 22vw, 220px), 1fr))` — fluid at every width with no breakpoint props.
- [x] `SearchBar` is a debounced `TextField` with a search icon and a clear button that returns to trending.
- [x] Distinct `EmptyState` for zero search results versus a trending failure.
- [x] `LoadMoreButton` disables during `loading-more` and shows a `CircularProgress`.

### Verified in a real browser (headless Chrome over CDP, real dev server)

No Puppeteer or Playwright is installed, so the browser was driven directly over the
**Chrome DevTools Protocol** using Node 24's built-in `WebSocket`. That let the test
actually click "Load more" instead of only inspecting the first paint.

| Scenario | Result |
|---|---|
| Trending tiles on first load | 20, all unique ids |
| Live TMDB posters | 20 real `image.tmdb.org` URLs, 0 placeholders |
| Card links | 20 anchors to `/dashboard/:id` |
| Skeletons after load | **0** — replaced correctly |
| Grid CSS | `repeat(auto-fill, minmax(clamp(140px, 22vw, 220px), 1fr))` |
| **Load more, clicked 9×** | grew 20 → 40 → 58 → 76 → 96 → 110 → 126 → 140 → 156 → **172** |
| **Page cap** | button gone after page 10, exactly as designed |
| **"End of results"** | rendered as `<p>` |
| **Duplicate audit** | **172 rendered / 172 unique — no duplicates** |
| JS errors during the run | none |
| Search `"blade runner"` (1 page) | 16 cards, no Load more, "End of results" shown |
| Search with no matches | 0 cards, `EmptyState` "No movies found" shown |
| Single character `"b"` | trending retained (20 cards), **no request sent** |
| Clearing the box | returns to trending, Load more restored |

> **Two real bugs were found by this testing and fixed. Both were invisible in the first-load check.**

**1. Duplicate movies (fixed).** The capped list rendered **199 tiles containing only 179
unique films**. TMDB's trending endpoint recycles titles *within* the first 10 pages, not
only beyond them — page 10 is a short page of 19, and page 11 starts re-serving earlier
titles. The cap alone did not prevent this. Fixed by deduping on `movie.id` inside the
`setResult` updater, preserving order. The per-click deltas of 14–20 (instead of a flat 20)
are the dedupe visibly working.

**2. A one-character query blanked the grid (fixed).** Typing a single character produced
**zero cards and no empty state** — the worst possible outcome. Two causes: the display
logic tested `!activeQuery`, which is false for `"b"`, so `trending` was forced to `[]`;
and `fetchPage` branched on `term.length > 0`, so it fired a pointless search request for a
one-character term. Fixed by introducing `effectiveQuery`, which treats any query below
`MIN_QUERY_LENGTH` as *no query at all*. Trending stays on screen, the subtitle stays
"Popular films this week", and no request is sent until the second character is typed.

> **A caveat worth recording: the first automated test reported a false negative.** The probe
> searched for a `<button>` containing "End of results", but `LoadMoreButton` renders that
> text as a `Typography` (`<p>`). The feature was working; the *test* was wrong. The same
> mistake made a working empty state look broken — it renders "No movies found", not
> "No results". Assert on the rendered text, not on the element type you assumed.

**Exit criteria: met.** Trending grid loads, search swaps results, Load More appends,
skeletons show during fetch, the cap holds at 10 pages, and there are no duplicates.

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
