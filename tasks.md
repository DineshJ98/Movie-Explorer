# Movie Explorer — Task Tracker

Strategy: **Routing First → Page-by-Page → Auth Last**

Legend: `[ ]` pending · `[~]` in progress · `[x]` complete · `[-]` cancelled

## Where We Are

Phases 0 through 5 are complete and verified. **TMDB session auth is wired end to
end** using TMDB's own password-free redirect flow, and protected routes are gated.
**Phase 6 (account-backed favourites) is next** — the last real feature, and the
reason auth was promoted ahead of it.

`FavoritesPage` is the last placeholder, and the favourites button on the details page
is still a disabled stub waiting for the account API.

**One thing cannot be automated:** the actual approval click on themoviedb.org needs a
real human on a real account. Everything up to the redirect and everything after it
was verified; see the note under Phase 5 before first manual run.

```
Phase 0  Foundation .................. DONE
Phase 1  Theme + routing skeleton .... DONE
Phase 2  TMDB data layer ............. DONE
Phase 3  /dashboard trending+search ... DONE
Phase 4  /dashboard/:id details ...... DONE
Phase 5  TMDB session auth ........... DONE
Phase 6  account-backed favourites ... NEXT      <- start here
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
| Current phase | **Phase 5 — COMPLETE** |
| Last updated | 2026-09-29 (P5 closed) |
| Build passing | Yes — `tsc`, `pnpm lint`, and `pnpm build` all clean |
| Next up | Phase 6 (account-backed favorites) |
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

Files created: `src/hooks/useMovieDetails.ts`, `src/components/movie/DetailSkeleton.tsx`, `src/components/movie/CastList.tsx`, `src/components/movie/FavoriteButton.tsx`, `src/components/ExpandableText.tsx`, `src/utils/format.ts`
Files modified: `src/pages/MovieDetailsPage.tsx`, `src/components/layout/PageContainer.tsx`, `src/types/tmdb.ts`

- [x] `useMovieDetails(id)` with a `'loading' | 'success' | 'error'` union, an `AbortController` cleaned up on unmount, a `requestIdRef` so a late reply cannot overwrite a fresher one, and a `retry` that bumps a counter rather than storing the id.
- [x] **Fetches purely from the URL param**, never from `MovieContext`. A cold deep link has no list loaded, and reading from a list cache is what makes detail pages break on refresh and on shared links.
- [x] Stale results are discarded by comparing the state's id against the requested id, so the previous movie never shows under a new URL.
- [x] `parseId` trims and matches `^\d+$` before `Number()`, then requires an integer > 0. `Number('')` is `0` and `Number('abc')` is `NaN`, so without this the service gets asked for a movie that cannot exist. Renders `EmptyState` instead.
- [x] Split `MovieDetailsPage` into the page (validates the param) and `MovieDetailsView` (calls the hook) so the hook is never called with an invalid id.
- [x] Single request with `append_to_response=credits,videos`, so cast and trailer arrive with the main payload instead of a second waterfall round trip.
- [x] `src/utils/format.ts` — `formatYear`, `formatReleaseDate`, `formatRuntime`, `formatRating`, `formatCount`. Each returns `null` for unusable input so the field can be omitted rather than printing "N/A".
- [x] `formatReleaseDate` rejects rolled-over dates: `new Date('2023-02-31')` silently becomes 3 March, so the UTC month and day are re-checked after construction.
- [x] Full-bleed backdrop with a gradient fade into the page, marked `aria-hidden` since the title is repeated as the `h1`.
- [x] Two-column grid — poster beside metadata on `md`+, stacked on mobile.
- [x] Title, release date, runtime, status and genre `Chip`s, plus a star `Rating`.
- [x] `ExpandableText` clamps the overview to 4 lines with a Read more toggle, driven by **measured overflow** rather than character count, so the control only appears when it is needed.
- [x) YouTube trailer in a 16:9 `Box` via `youtube-nocookie.com`, preferring an official trailer then any trailer, and the whole section is omitted when there is none.
- [x] `CastList` — horizontal scroll, circular avatars, capped at 12 with a "+N more cast members" summary. Overflow arrows render only when the row actually overflows, measured after layout.
- [x] Cast members without a `profile_path` fall back to initials rather than a broken image.
- [x] `vote_average` of 0 renders "Not rated yet" with no stars, no `/10` and no vote count, because TMDB's 0 means "no votes yet", not a universally panned film.
- [x] `FavoriteButton` ships as a **disabled** stub. It has no click handler: `FavoritesContext` does not exist until Phase 6, and favourites are stored against a TMDB account, so wiring it now would mean guessing an API. Disabled rather than inert so the page never ships a control that silently does nothing.

### Verified in a real browser (headless Chrome over CDP)

| Scenario | Result |
|---|---|
| **Cold deep link `/dashboard/550`** | "Fight Club" renders with **no list ever loaded** |
| `h1` count | exactly 1, no duplicate heading |
| Chips | `15 Oct 1999`, `2h 19m`, `Released`, `Drama`, `Thriller` |
| Rating | `8.4/10` |
| Poster | live `image.tmdb.org` URL |
| Backdrop | loaded |
| Cast | 12 avatars + "+64 more cast members" |
| Trailer | `youtube-nocookie.com/embed/dfeUzm6KF4g` |
| Favourite stub | present and disabled |
| Skeletons after load | 0 |
| Invalid param `/dashboard/abc` | `EmptyState` "That is not a valid movie link" |
| Nonexistent id `/dashboard/9999999` | 404 mapped to "We could not find a movie with id 9999999…" + Retry |
| **Client-side nav `/dashboard/550` → `/278`** | "The Shawshank Redemption", 1 `h1`, 0 stale skeletons, no error |
| **Worst case `id=869908`** (no video, cast, overview, backdrop **or poster**) | placeholder poster, sections omitted, **0 JS errors** |
| Cast scroll arrows | left disabled at start, right enabled |
| JS errors across all runs | none |

> **Three real bugs were caught and fixed by this testing.** None were visible from a
> first-load desktop screenshot.

**1. "Read more" disappeared when clicked (fixed).** `ExpandableText` measured overflow
with `scrollHeight > clientHeight`. Once expanded, the element is unclamped, so those two
values are equal, the text looks like it fits, and the toggle disappeared — leaving **no way
to collapse the text again**. Fixed by skipping the measurement while expanded, so the
control becomes "Read less" and stays.

**2. Horizontal scroll on mobile (fixed).** The backdrop used a hardcoded
`width: calc(100% + 48px); ml: -3` to bleed past the `Container`. But MUI's `Container`
padding is **16px at `xs` and 24px from `sm`**, so the 24px offset over-shot by 8px and the
page scrolled sideways on a 390px screen. Fixed with `mx: { xs: -2, sm: -3 }`, which tracks
the real responsive gutter instead of guessing it.

**3. Poster off-centre on mobile (fixed).** The poster is capped at 220px but the mobile grid
column is 358px, leaving it hugging the left edge. Now centred — verified at 69px on each side.

**Read more verified at three widths.** TMDB overviews top out around 340 characters, which
fits in 4 lines on desktop. At 1280px and 700px the toggle is correctly **absent**
(`box === scroll === 102`); only at 390px does the text overflow (`102` vs `179`) and the
toggle appear. Measuring it at one width would have missed this entirely.

**The 0-rating guard was verified by stubbing the API.** No 0-vote film is reachable through
TMDB's discover, trending, or search endpoints, so rather than assume, the response was
intercepted over CDP `Fetch.fulfillRequest` with a synthetic `vote_average: 0`. Result:
"Not rated yet" rendered, **0** star icons, no `/10`, no vote count.

> **Two more false negatives in my own probes**, same class as the Phase 3 ones. A test
> reported "no error alert" for `/dashboard/9999999` purely because it sampled the first few
> lines of the body, which were the nav; the alert was present a second later. And
> `/dashboard/1399` was used to force the text clamp, but that id no longer exists on TMDB.
> **Always confirm a missing element is really absent before changing code.**

**Exit criteria: met.** Cold deep link to `/dashboard/550` renders fully after a hard
refresh, and every missing-data path degrades cleanly.

---

## Phase 5 — TMDB session auth

Files created: `src/types/tmdbAuth.ts`, `src/api/authService.ts`, `src/context/AuthContext.tsx`, `src/context/authContextValue.ts`, `src/pages/LoginPage.tsx`, `src/pages/AuthCallbackPage.tsx`, `src/utils/sessionStorage.ts`
Files modified: `src/routes/AppRouter.tsx`, `src/routes/ProtectedRoute.tsx`, `src/components/layout/AppBar.tsx`, `src/main.tsx`, `src/context/MovieContext.tsx`, `src/utils/storage.ts`

- [x] Auth types taken from **live responses**, not docs. `avatar.tmdb.avatar_path` is nullable with a `gravatar.hash` sibling, and `name` is often `""` even when `username` is set.
- [x] `createRequestToken()` uses **GET**. Verified live: `POST` returns `{ success: false, status_code: 34 }` with no token.
- [x] `buildApprovalUrl()` uses `window.location.origin` so it works on any host, and `redirect_to` is verified to round-trip through TMDB unchanged.
- [x] `createSession()` puts `request_token` in the **body**, and handles both refusal shapes (see the bug below).
- [x] `getAccount()` always sends `session_id` as a query param. **Without it TMDB returns 200 with the API key's *own* account**, so omitting it would silently sign the user in as the token owner. `account_id` is only ever read from this response.
- [x] `deleteSession()` sends `session_id` as a **query param, not a body**. Verified in-browser: `DELETE /tmdb/authentication/session?session_id=…` with an empty body.
- [x] `logout()` revokes server-side, and clears local state **first** so a failed revoke can never strand the user half-signed-in.
- [x] Persists only `{ session_id, account_id, username, avatar_path, saved_at }`. No password exists in the app; the approval token is exchanged before anything is written.
- [x] `readStoredSession()` validates every field and **discards a malformed entry**. The stored blob is untrusted input, and `session_id` is a write credential.
- [x] Session restored on mount, and revalidated against `/account` so a renamed account or new avatar appears and `account_id` can never drift from the authorising session.
- [x] Initial auth status is **derived during render** from a lazy `useState(() => readStoredSession())`, not set in an effect. An effect that only calls `setStatus('anonymous')` trips `set-state-in-effect`.
- [x] `ProtectedRoute` renders a spinner while `status === 'loading'`. Redirecting on `loading` would bounce a signed-in user to `/login` on every hard refresh.
- [x] `LoginPage` has **one button and no input at all**. A source-wide grep for `type="password"` and `validate_with_login` returns nothing.
- [x] `/auth/callback` is a **public** route, outside `AppLayout`, since TMDB redirects there before any session exists.
- [x] Callback derives "denied" during render from the query string rather than setting it in an effect, and a `startedRef` makes the single-use token exchange happen exactly once under StrictMode.
- [x] Every callback path ends in a working link: denied, no token, and failed all offer "Back to sign in" and "Go to dashboard".
- [x] `state.from` is persisted to storage across the round trip, because router `location.state` cannot survive a full navigation to tmdb.org. Validated against open redirect (`/^\/(?!\/)/`), so a tampered entry cannot bounce the user off-site.
- [x] `AppBar` shows an avatar + `username` menu with a `ListItemIcon` logout. Falls back to `Account {id}` because `username` can be empty.
- [x] Trending is gated on `status === 'authenticated'`, so anonymous visitors on `/login` trigger **zero** TMDB calls.
- [x] `MovieProvider` stays mounted at the layout level (not moved under `ProtectedRoute`) so the loaded list survives dashboard → details → back. Gating achieves both goals; re-mounting would have discarded the list.

### Verified live (headless Chrome over CDP, plus direct API calls)

| Scenario | Result |
|---|---|
| Anonymous deep link `/dashboard/550` | redirects to `/login`, **0 password inputs**, 0 TMDB calls |
| Anonymous `/favorites` | redirects to `/login` |
| `?approved=false` (user denied) | "Sign-in not completed" + correct explanation |
| Callback with no params (tab closed) | "TMDB did not send an approval token" |
| Callback, unapproved token | "TMDB did not approve that sign-in" + nothing stored |
| **Invalid stored session** | **discarded**, no loop, sent to `/login` |
| Authenticated (stubbed `/account`) | avatar menu + `testuser` in the AppBar |
| **Logout** | `DELETE /tmdb/authentication/session?session_id=…`, body `null` |
| After logout | storage cleared, menu gone, back at `/login` |
| `username` empty | falls back to `Account {id}` |
| **dashboard → details → back** | 20 cards preserved, **trending fetched exactly once**, no skeleton flash |
| Hard refresh while authenticated | lands on `/dashboard`, no `/login` flash |
| Password field anywhere in `src/` | **none** |
| `validate_with_login` anywhere | **none** |

> **Two real bugs found and fixed, both invisible without running the code.**

**1. Denying approval told the user to check their API token (fixed).** TMDB answers an
unapproved `request_token` with **HTTP 401** and `{ status_code: 17, "Session denied." }`.
The shared response interceptor rewrites every 401 to `TMDB_UNAUTHORIZED`, so the
callback told someone who had simply clicked "Deny" to go and fix `VITE_TMDB_TOKEN` —
an instruction with no relation to what they did. Added `SESSION_DENIED`, and
`createSession` now re-labels a 401 as a refusal. It checks **both** refusal shapes
(401 with a body, and 200 with `success: false`) because checking either one alone
would let the other through. The original error is kept as `cause`.

**2. Anonymous visitors triggered a trending request (fixed).** `MovieProvider` wrapped
the whole layout, so it fired `/trending/movie/week` on `/login` and on any protected
route one redirect away from it. The obvious fix — move the provider under
`ProtectedRoute` — was **rejected on purpose**: it would discard the loaded list every
time the user clicked a card and came back, showing skeletons and refetching. Gating
the fetch on `isAuthenticated` instead keeps both properties, and that trade-off is now
covered by a regression test above.

> **The one thing not automated.** Everything up to the redirect and everything after
> the approval was verified, but the middle step — a human clicking "Approve" on
> themoviedb.org — needs a real account. Before the first manual run: start `pnpm dev`,
> click "Sign in with TMDB", and confirm you land back on `/dashboard` with your avatar
> in the bar. If `redirect_to` is rejected, TMDB requires the origin to be registered in
> your API settings.

**Exit criteria: met**, pending that one human click. The redirect URL, the callback,
the restore path and the server-side revoke are all verified against the real API.

---

## Deployment fix — the Vercel build (2026-09-30)

Reported symptom: sign-in "redirected locally" but the deployed app always landed back
on the login page. TMDB was **not** at fault. Two bugs exist only in a production build,
which is exactly why `pnpm dev` hid both of them.

### Bug 1 — `baseURL: '/tmdb'` is a dev-server path, and it shipped

`src/api/tmdbClient.ts` used `baseURL: '/tmdb'`, which is served by the `vite.config.ts`
dev proxy. That proxy is a property of `vite dev` and **is not compiled into the bundle**.
Confirmed against the live deployment, not inferred:

| Probe | Result |
|---|---|
| `baseURL` in the deployed bundle | `` `/tmdb` `` |
| `GET /tmdb/3/trending/movie/week` on the deployed host | **404** `NOT_FOUND` |
| Same request direct to `api.themoviedb.org` | 200 |

So every TMDB call in production asked Vercel for a file that does not exist, including
`GET /authentication/token/new`. The button therefore could never obtain a request
token, never left the login page, and looked like a broken redirect.

Fixed by making the base URL environment-aware: `/tmdb` in dev (keeping the proxy and its
CORS-free behaviour) and `https://api.themoviedb.org/3` in production. This is safe
because TMDB's CORS policy is explicitly permissive — verified with a real preflight:
`access-control-allow-origin: *`, `access-control-allow-headers: Authorization, …`,
`access-control-allow-methods: GET,HEAD,PUT,POST,DELETE,OPTIONS`.

### Bug 2 — no SPA rewrite, so `/auth/callback` returned a 404 page

`/auth/callback` is where TMDB sends the browser back to. With no rewrite, the host
looked for a file at that path and returned its own 404 page, so the callback component
never mounted even on a successful approval. `/dashboard/550` 404'd the same way.

Fixed with `vercel.json`. `rewrites` are evaluated **after** Vercel's filesystem check,
so hashed files under `/assets/` are still served and only unmatched paths fall through
to `index.html`.

### Verified against the real production build

Served from `dist/` via `vite preview` (which has **no** dev proxy and **no** rewrite
layer, so it reproduces production conditions) and driven over CDP:

| Scenario | Result |
|---|---|
| Anonymous deep link `/dashboard/550` | `/login`, 0 password inputs, **0 TMDB calls** |
| **Hard load of `/auth/callback?approved=false`** | **SPA served, not a 404** — denial state renders |
| Callback with no params | renders "Sign-in not completed" |
| Authenticated dashboard, prod build | `200` straight from `api.themoviedb.org/3/trending/...`, 20 cards |
| Any `/tmdb/` path in production traffic | **none** |
| Stubbed `/account` | Account menu + `prodtester` in the AppBar, stays on `/dashboard` |
| Sign out | `DELETE /3/authentication/session?session_id=…`, **no body**, storage cleared, back to `/login` |
| Invalid stored session | real `401` from `/account`, session discarded, no loop |
| Console errors | none |

### Bug 3 — a failed sign-in left the button permanently disabled (found while testing)

`LoginPage` set `starting=true`, but `beginLogin` caught its own errors, so a failed
token request left the user staring at a disabled "Redirecting to TMDB" button with no
way to retry. `beginLogin` now rethrows so the page can restore the button; verified by
blocking the token endpoint, which leaves the button enabled and shows
"Sign-in could not be completed. Please try again."

### Redeploy checklist

1. `vercel.json` must be committed — it is what adds the SPA rewrite.
2. `VITE_TMDB_TOKEN` must be set in the Vercel project's **Environment Variables** for
   Production. It is `VITE_`-prefixed, so it is inlined at build time and changing it
   requires a rebuild, not just a redeploy.
   (Confirmed the previous deployment did have it baked in, so this is likely already fine.)
3. No TMDB domain registration is needed. TMDB was checked directly: it accepts a
   `*.vercel.app` `redirect_to` and echoes it back intact.

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
