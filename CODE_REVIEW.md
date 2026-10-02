# Code Review — `fix-secret`

Reviewed at `f5908aa`. Read-only review; **no code was changed.**

Scope: everything in `src/`, `api/`, `server/`, plus `vite.config.ts`, `vercel.json`, `package.json`, `index.html`, `public/theme-init.js`, and the three tsconfigs.

The branch works — sign-in, trending, search, and pagination all function, and the token genuinely never reaches the client bundle. The problems below are maintainability, correctness-under-change, and dead weight. Severity is about *risk if someone changes this*, not about whether it breaks today.

---

## 1. The headline: no tests at all

**Severity: High** · `package.json`, whole repo

There is no test runner, no test script, and no test file anywhere. Every non-obvious behaviour in this codebase was discovered the expensive way — by hitting the live TMDB API and reading the response, as the comments repeatedly attest:

> "Verified live against TMDB: `POST` returns `{ success: false, status_code: 34 }`"
> "Verified live: omitting it returns 400 Invalid parameters"
> "an empty search returns `total_pages: 1` with zero results (verified live)"

That knowledge is now encoded only in prose comments. Comments do not fail when they rot. There is no `.github/workflows` either, so nothing runs on push.

The highest-value tests, cheapest first:

| Target | Why it is worth a test |
|---|---|
| `server/tmdbProxy.js` `SAFE_RESOURCE` gate | The one place a crafted path could reach upstream. A table of accepted/rejected resources is ~15 lines. |
| `src/utils/format.ts` | Pure functions with nasty edge cases already documented: `2023-02-31` rollover, `0.0` rating meaning "unrated", `139 → 2h 19m`. Trivial to test, and the comments prove the edge cases were *found* the hard way. |
| `src/utils/sessionStorage.ts` | Validates untrusted `localStorage`. A malformed-entry regression is a silent sign-in failure. |
| `toPagedResult` in `movieService.ts` | The empty-search `hasMore` bug is already a documented real bug. |

Everything currently verified by hand during this session — the 9/9 route matrix, the parse fix, the token-leak scan — is exactly what a test file would make permanent.

**Recommendation:** add Vitest, cover the four targets above, add a CI workflow running `lint` + `tsc -b` + `test` + `build`.

---

## 2. Six code comments point at a file that no longer exists

**Severity: High** (documentation accuracy) · `.env.example:11`, `vite.config.ts:93,127`, `src/api/tmdbClient.ts:13`, `server/tmdbProxy.js:16`

Commit `f5908aa` deleted `api/tmdb/[...path].js`. Five places still tell the reader that this is where the token is injected:

```
.env.example:11            production  -> api/tmdb/[...path].js reads it and does the same
vite.config.ts:93          server-side by api/tmdb/[...path].js from TMDB_TOKEN
vite.config.ts:127         `api/tmdb/[...path].js` does in production
src/api/tmdbClient.ts:13   production `api/tmdb/[...path].js` reads `TMDB_TOKEN`
```

`server/tmdbProxy.js:16` is the exception and is correct — it refers to the catch-all in past tense to explain why routes are now explicit.

This matters more than ordinary stale comments. `vite.config.ts:93` is the **production build guard** — the error text a developer sees when a deployment breaks. Pointing them at a deleted file while they debug is actively unhelpful.

Correct target is `server/tmdbProxy.js`.

---

## 3. An edit left a real indentation defect

**Severity: Low** (cosmetic, but signals unenforced formatting) · `src/api/tmdbClient.ts:41`

```ts
      } else if (status === 404) {
        error.message = TMDB_NOT_FOUND
} else if (status === 504) {          // ← column 1
        // The proxy could not reach TMDB. Distinct from an auth failure.
        error.message = TMDB_UPSTREAM_UNREACHABLE
      }
```

The `504` branch lost its indentation in `a1de0bd`. `pnpm lint` passes because ESLint here does not enforce indentation, and **Prettier is not installed or configured** — there is no `format` script, no `.prettierrc`, and `node_modules/.bin/prettier` does not exist. Nothing in the toolchain can catch this class of drift, so it will recur.

**Recommendation:** add Prettier with a config and a `format:check` script in CI. It is a large diff once, then free.

---

## 4. `server/` sits outside every tsconfig

**Severity: Medium** · `tsconfig.app.json:30`, `tsconfig.node.json:22`, `eslint.config.js:11`

`include` is `["src"]` in one project and `["vite.config.ts"]` in the other. `server/tmdbProxy.js` and all seven files in `api/` are in **neither**.

So the proxy — the component that handles user-controlled paths and holds the server token — gets:

- no type checking
- no ESLint
- no `strict` / `noUncheckedIndexedAccess` guarantees

`eslint.config.js` scopes rules to `**/*.{ts,tsx}` and only ignores `dist`, so the JS files there are invisible to the linter. `pnpm build` runs `tsc -b && vite build` and neither project includes them.

This is the highest-risk gap relative to how much security-relevant logic sits in that file.

**Recommendation:** add a `tsconfig.server.json` including `server` and `api` with `allowJs`, `checkJs`, and `strict`, referenced from `tsconfig.json`. At minimum, widen the ESLint `files` glob to cover `api/**/*.js` and `server/**/*.js`.

---

## 5. Two divergent names for the same environment variable

**Severity: Medium** · `vite.config.ts:132` vs `server/tmdbProxy.js:31`

| Environment | Variable | Used by |
|---|---|---|
| Vite (client-visible) | `VITE_TMDB_API_ORIGIN` | dev proxy target |
| Node (server) | `TMDB_API_ORIGIN` | `server/tmdbProxy.js` |

Only the first is in `.env.example`. `TMDB_API_ORIGIN` is undocumented and unsettable from `.env.local`, so the documented knob and the real knob differ by a prefix. Anyone setting `TMDB_API_ORIGIN` in Vercel to match local behaviour gets silently different behaviour in the two environments — the exact class of drift this branch was assembled to eliminate.

**Recommendation:** pick one name. Since the proxy's target is server-side in both environments now, `TMDB_API_ORIGIN` for both is the honest choice; document it.

---

## 6. Storage keys are inconsistent, and one key is duplicated as a literal

**Severity: Medium** · `src/utils/storage.ts:1-6`, `public/theme-init.js:14`

```ts
export const STORAGE_KEYS = {
  theme: 'movieexplorer:theme',          // namespaced
  session: 'me:session',                 // ← not
  favorites: 'movieexplorer:favorites',  // namespaced
  pendingRedirect: 'movieexplorer:pending-redirect',
} as const
```

Three of four share a `movieexplorer:` namespace. `me:session` does not. The key holding a **live write credential for a real TMDB account** is the odd one out, which is precisely backwards — it should be the most clearly owned.

Separately, `theme-init.js:14` hardcodes `'movieexplorer:theme'` because it must run before any module loads. The comment admits the coupling ("Kept in sync with STORAGE_KEYS.theme"). Two sources of truth for one string, with no test to catch a rename.

**Recommendation:** namespace `me:session`. For the theme key, either have `theme-init.js` read a name emitted at build time, or add a test asserting the literal matches `STORAGE_KEYS.theme`.

---

## 7. `session_id` travels in query strings

**Severity: Medium** (accepted upstream constraint, worth recording) · `src/api/authService.ts:92,112`

`session_id` is sent as a query parameter for `/account` and `DELETE /authentication/session`. This is TMDB's API shape, not a choice — and the code documents it well. But the consequence deserves to be written down where a reader will find it:

- the credential lands in Vercel access logs and any intermediary log
- it appears in `Referer` if a response ever links outward
- the proxy forwards it deliberately (`BLOCKED_QUERY_PARAMS` blocks `api_key`/`api_token`, not `session_id`)

Note the asymmetry: the proxy blocks query params that could **override** auth but happily forwards the session credential. That is correct behaviour, but the file gives no hint that anyone thought about it.

**Recommendation:** add a comment in `tmdbProxy.js` stating that `session_id` is forwarded by design and why. Worth confirming Vercel log retention does not retain query strings longer than the session is valid.

---

## 8. Abort controller bookkeeping is more complex than it needs to be

**Severity: Medium** · `src/context/MovieContext.tsx:53-96`, `src/hooks/useMovieDetails.ts:39-75`

Both files maintain **two** independent staleness guards:

```ts
abortRef.current?.abort()          // guard A: cancel the in-flight request
requestIdRef.current += 1          // guard B: ignore a late response
const requestId = requestIdRef.current
...
if (requestId !== requestIdRef.current) return   // checked twice
if (controller.signal.aborted) return            // also checked
```

Four mechanisms for one job. `requestId` already subsumes the aborted check: an aborted request is, by construction, one whose id is no longer current.

The manual `requestIdRef` pattern is also the standard workaround for a race that `AbortController` does not cover — a response that resolved *before* `abort()` took effect still lands. So guard B is not gratuitous. But the redundancy is undocumented, so the next reader has to re-derive which checks are load-bearing.

**Recommendation:** keep `requestId`, drop the `signal.aborted` guards as redundant, and comment why the id check cannot be removed. Or extract one `useLatestRequest` hook — this exact pair of lines is duplicated across two files, which is the clearer smell.

---

## 9. `retry()` re-appends a page that may already be present

**Severity: Medium** · `src/context/MovieContext.tsx:137-141`

```ts
const retry = useCallback(() => {
  const page = result.page === 0 ? 1 : result.page
  void fetchPage(effectiveQuery, page, result.page === 0 ? 'replace' : 'append')
}, [...])
```

After a failed `loadMore` on page 3, `result.page` is 2, so retry fetches page 3 in `append` mode. The dedupe in `fetchPage` (`new Set(base.map(m => m.id))`) means duplicates are dropped, so this is *not* a data bug.

It is still unclear intent: page 3 failed, so it was never merged, yet the code assumes the previous page is merged and appends. The invariant is "append is safe because dedupe exists", which happens to hold. Worth stating, because a future edit that removes the dedupe (say, to preserve TMDB ordering) would turn this into visible duplicate rows.

**Recommendation:** comment the invariant, or make `retry` always `replace` when the last attempt failed.

---

## 10. `requestToken as string` is an unchecked assertion

**Severity: Medium** · `src/pages/AuthCallbackPage.tsx:53`

```ts
const isDenied = !requestToken || approved === 'false'
...
const ok = await completeLogin(requestToken as string)
```

`as string` defeats the null check entirely — `isDenied` is what actually guarantees it, but that relationship is enforced by a cast rather than by types. If someone reorders the two statements, or `isDenied` is edited to allow a missing token, the cast silently passes `null` into `completeLogin`.

The comment above it ("requestToken is non-null whenever !isDenied") shows the reasoning is correct; it is just not type-enforced.

**Recommendation:**
```ts
const requestToken = searchParams.get('request_token')
...
if (!requestToken || approved === 'false') { /* denied */ }
```
so control flow narrows the type and the cast disappears.

---

## 11. `FavoritesContext` is referenced but does not exist

**Severity: Low** · `src/components/movie/FavoriteButton.tsx:8`

> "The data source (`FavoritesContext`) does not exist until the auth and favourites phases"

Fine as a roadmap note. But `FavoritesPage` is **live in the nav** (`AppBar.tsx:25` links to `/favorites`) and renders only a heading plus a "Browse trending" button. A user can navigate to a page titled "Favorites — Synced to your TMDB account" that contains nothing, and `FavoriteButton` renders disabled on every details page.

Two honest options: hide the nav item and stop rendering the stub until the feature lands, or label it clearly as not-yet-implemented. Shipping a nav item that leads to an empty page reads as a bug.

---

## 12. "Favorites" vs "Favourites" mixed within one UI

**Severity: Low** · `src/pages/FavoritesPage.tsx:10`, `src/components/layout/AppBar.tsx:25` vs `src/pages/LoginPage.tsx:90`

```
Favorites      → AppBar nav, FavoritesPage title, all identifiers
Favourites     → LoginPage body copy ("Favourites follow your account")
```

`en-GB` formatting elsewhere (`format.ts` uses `Intl.DateTimeFormat('en-GB')`) and British spellings in prose suggest UK English was intended, but the user-visible labels went the other way. Identifiers being US-spelled is fine; UI copy should be consistent with itself.

---

## 13. Dead exports

**Severity: Low** · `src/types/tmdb.ts:101`, `src/types/tmdbAuth.ts:49`

Confirmed declaration-only, zero consumers:

- `TmdbMovieDetailResponse` — duplicates fields already on `TmdbMovieDetail` (`credits`, `videos`); `TmdbMovieDetail` already declares both. Genuinely redundant.
- `TmdbActionResult` — reserved for TMDB write endpoints that do not exist yet. Reasonable to keep as a stub, but it is currently speculative.

Also `TmdbCrewMember`, `TmdbProductionCompany`, and `TmdbGenre` are referenced only within `tmdb.ts` itself — fine as part of a coherent response model, unlike the two above.

---

## 14. `TmdbPagedResponse` is typed as fully required; the code defensively handles missing fields

**Severity: Low** · `src/types/tmdb.ts:93-98` vs `src/api/movieService.ts:22-24`

```ts
export interface TmdbPagedResponse<T> {
  page: number
  results: T[]        // required
  total_pages: number // required
  total_results: number
}
```

`toPagedResult` then defends against all three being absent:

```ts
const items = response.results ?? []
const totalResults = response.total_results ?? items.length
const totalPages = response.total_pages ?? 1
```

The `??` fallbacks are unreachable given the declared type — the types say these always exist. One of the two is wrong. The defensive version is the right instinct for a third-party API that "omits fields silently" (as the file's own header says), so the **types** should be the ones loosened.

**Recommendation:** make the envelope fields optional, or drop the unreachable fallbacks. Keeping both invites the reader to wonder which is load-bearing.

---

## 15. `theme-init.js` and `ThemeContext` both compute "initial mode" separately

**Severity: Low** · `public/theme-init.js:13-22` vs `src/context/ThemeContext.tsx:19-23`

The stored-value-or-system-preference logic is implemented twice:

```js
// theme-init.js
var stored = localStorage.getItem('movieexplorer:theme')
var mode = stored === 'light' || stored === 'dark' ? stored
         : window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
```

```ts
// ThemeContext.tsx
function initialMode(): ColorMode {
  const stored = readStoredValue<ColorMode | null>(STORAGE_KEYS.theme, null)
  if (stored === 'light' || stored === 'dark') return stored
  return systemPrefersDark() ? 'dark' : 'light'
}
```

The duplication is unavoidable — one must run before the bundle exists — but nothing records that constraint at the React end. A change to one (say, adding a `'system'` option) silently diverges from the other and reintroduces a theme flash. `theme-init.js` also sets `dataset.theme`, which nothing in the React tree reads.

---

## 16. `initialMode` runs a side-effecting read during render

**Severity: Low** · `src/context/ThemeContext.tsx:26`

```ts
const [mode, setModeState] = useState<ColorMode>(initialMode)
```

Passing the function to `useState` makes it a lazy initialiser, which React calls exactly once. That is correct and intentional — and the `AuthContext` above it uses the same pattern with a comment explaining why. Consistency is good here.

The remaining wrinkle: `initialMode` reads `localStorage` and `matchMedia` as a side effect of render. In React 19 StrictMode this runs twice in dev. Harmless for reads, and the comment in `AuthContext.tsx:48-54` shows the pattern was chosen deliberately to avoid a `set-state-in-effect` cascade. Just noting the two providers reached the same conclusion independently rather than sharing a helper.

---

## 17. `toggleMode` writes storage inside a state updater

**Severity: Low** · `src/context/ThemeContext.tsx:33-39`

```ts
const toggleMode = useCallback(() => {
  setModeState((current) => {
    const next = current === 'light' ? 'dark' : 'light'
    writeStoredValue(STORAGE_KEYS.theme, next)   // ← side effect in updater
    return next
  })
}, [])
```

A state updater must be pure. React may call it more than once per dispatch (StrictMode double-invokes updaters in development), so this writes `localStorage` twice on every toggle. `setMode` on line 28 does the same work correctly, outside the updater.

**Recommendation:**
```ts
const toggleMode = useCallback(() => {
  setModeState((current) => (current === 'light' ? 'dark' : 'light'))
}, [])

useEffect(() => { writeStoredValue(STORAGE_KEYS.theme, mode) }, [mode])
```
which also removes the duplicated write logic between `setMode` and `toggleMode`.

---

## 18. `systemPrefersDark` does not guard `matchMedia` throwing

**Severity: Low** · `src/context/ThemeContext.tsx:14-17`, effect at `45`

```ts
function systemPrefersDark(): boolean {
  if (typeof window === 'undefined' || !window.matchMedia) return false
  return window.matchMedia('(prefers-color-scheme: dark)').matches
}
```

`systemPrefersDark` checks for the function's existence, but the effect at line 45 calls `window.matchMedia(...)` with **no such guard**:

```ts
const query = window.matchMedia('(prefers-color-scheme: dark)')
query.addEventListener('change', onChange)
```

So the defensive check protects one of two call sites. Very old browsers without `matchMedia` would throw in the effect and take down the provider. The existing check shows the author considered this — it just is not applied consistently.

---

## 19. Bundle is a single 696 kB chunk with no code splitting

**Severity: Medium** · build output, `dist/assets/index-*.js` 696 kB (221 kB gzip)

Vite already warns:

```
(!) Some chunks are larger than 500 kB after minification.
```

Likely dominated by MUI plus `@mui/icons-material`, which is a barrel import — importing `@mui/icons-material/Search` pulls the package's module graph through the bundler. Route-level `React.lazy` would at least defer `MovieDetailsPage`, which pulls in the cast list and trailer embed.

The cast-list row and the detail skeleton are only needed on one route. A `lazy()` boundary per route is low-risk and would cut first paint meaningfully.

**Recommendation:** `const MovieDetailsPage = lazy(() => import('./pages/MovieDetailsPage'))` behind a `<Suspense>`, then re-measure. Confirm the win with `vite build` before and after rather than assuming.

---

## 20. `vercel.json` CSP omits `frame-src` for the YouTube embed domain used

**Severity: Medium** · `vercel.json:17` vs `src/pages/MovieDetailsPage.tsx:237`

```json
frame-src https://www.youtube-nocookie.com
```

and the embed uses exactly that host. So this one **is** correct — flagged only because it is easy to get wrong and worth a regression test. The trailer key is interpolated into the URL without validation:

```ts
src={`https://www.youtube-nocookie.com/embed/${trailerKey}?rel=0`}
```

`trailerKey` comes from TMDB and is filtered on `site === 'YouTube'`, so in practice it is a YouTube id. It is not validated against `/^[A-Za-z0-9_-]+$/`, so a hostile or malformed TMDB payload could inject characters into the src. The host cannot be changed this way, so this is not an open redirect — but validating the id is one line and removes the question.

**Recommendation:** `if (!/^[\w-]+$/.test(trailer.key)) return null` in `findTrailerKey`.

---

## 21. `AppBar` marks `/dashboard/:id` as inactive

**Severity: Low** · `src/components/layout/AppBar.tsx:74`

```ts
const active = pathname === item.to
```

On `/dashboard/550` the Dashboard nav item renders in its inactive style while the user is plainly on the dashboard section. `pathname.startsWith(item.to)` would fix it, but that needs care: `/favorites` must not match a hypothetical `/favorites-archive`.

---

## 22. Accessibility gaps

**Severity: Medium** · several files

- `SearchBar.tsx:14` — `TextField` has a placeholder but no `label` or `aria-label`. Placeholders vanish on input and are not a reliable accessible name.
- `MovieDetailsPage.tsx:179-185` — `<Rating readOnly>` plus adjacent text. The `aria-label` is on the rating, but the visible `/10` suffix is a nested `Typography component="span"` inside another `Typography`, which nests a `<p>` inside a `<p>` in some MUI configurations. Worth verifying in the rendered DOM.
- `CastList.tsx` — arrow buttons need `aria-label`s for direction ("previous cast member"), not just icons.
- `ExpandableText.tsx:68-74` — the Read more button should carry `aria-expanded`.
- `AppBar.tsx:106` — `Avatar alt=""` with an `AccountCircle` fallback is correct, but the `Tooltip` on the `IconButton` is the only name source; that part is fine.
- `MovieCard.tsx:26-46` — `Card component={RouterLink}` wrapping a `CardActionArea` produces nested interactive elements (an `<a>` containing a focusable div with click handling). Screen readers announce this awkwardly, and the `focus-visible` outline is styled on the outer element while focus may land on the inner.

---

## 23. `ExpandableText` measures overflow in a layout effect that re-runs on every expansion

**Severity: Low** · `src/components/ExpandableText.tsx:30-47`

```ts
const update = () => {
  if (expanded) return
  setOverflows(el.scrollHeight > el.clientHeight + 1)
}
update()
const observer = new ResizeObserver(update)
observer.observe(el)
...
}, [text, collapsedLines, minHeight, expanded])
```

The effect depends on `expanded` **and** the `update` closure guards on `expanded`, so every toggle tears down and recreates the `ResizeObserver`. The early return means the measurement does not run while expanded, which is correct behaviour — but the coupling is subtle enough that the next edit could remove the guard and make the button flicker away.

Also `minHeight` is a required prop with no documented unit, and it is passed as a raw number to `sx`. It works because MUI treats numbers as `px`, but an explicit `minHeightPx` or a comment would be clearer.

---

## 24. `MAX_PAGES` cap and `isCapped` reporting are entangled

**Severity: Low** · `src/context/MovieContext.tsx:84,156`

```ts
hasMore: res.hasMore && page < MAX_PAGES,
...
isCapped: isFresh && !result.hasMore && result.items.length > 0,
```

`isCapped` is derived from `!hasMore`, so it is also true when TMDB genuinely ran out of pages. A user who reaches the natural end of the list is told they hit a cap, which is a small lie about the data. The context type documents `isCapped` as "True once the page cap is reached", which the implementation does not guarantee.

**Recommendation:** carry the reason explicitly — `hasMore: false, cappedAt: MAX_PAGES` — and derive `isCapped` from `cappedAt`, not from the absence of more pages.

---

## 25. `getPosterUrl` falls back to a hardcoded external placeholder

**Severity: Low** · `src/utils/imageUrl.ts:36`

```ts
const NO_POSTER = 'https://placehold.co/500x750/e8eaee/6b7280?text=No+poster'
```

An external third-party image for every movie without artwork. It is in the CSP `img-src` allowlist, and it does leak visitor IPs and referrers to a host the project does not control, on a page that otherwise makes no third-party requests. A local SVG placeholder in `public/` would be free and offline-safe.

---

## 26. `noUncheckedIndexedAccess` is on, and `format.ts` destructures a regex match anyway

**Severity: Low** · `src/utils/format.ts:23`

```ts
const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(releaseDate)
if (!match) return null
const [, y, m, d] = match
```

With `noUncheckedIndexedAccess`, `match[1]` is `string | undefined`, so `Number(m)` is `Number(string | undefined)` — which compiles because `Number` accepts `any`. The guard on the previous line is what makes it safe, and it is correct. Worth noting only because the compiler is being satisfied by `Number`'s loose signature rather than by the type system.

---

## Summary

| # | Area | Severity |
|---|---|---|
| 1 | No tests, no CI | High |
| 2 | Comments reference a deleted file (incl. the build guard) | High |
| 4 | `server/` + `api/` outside all tsconfigs and ESLint scope | Medium |
| 5 | `TMDB_API_ORIGIN` vs `VITE_TMDB_API_ORIGIN` | Medium |
| 6 | Storage keys unnamespaced; theme key duplicated as literal | Medium |
| 7 | `session_id` in query strings — undocumented | Medium |
| 8 | Redundant staleness guards, duplicated across two files | Medium |
| 9 | `retry()` append-semantics rely on dedupe | Medium |
| 10 | `requestToken as string` unchecked assertion | Medium |
| 19 | 696 kB single chunk, no route splitting | Medium |
| 20 | Trailer key unvalidated | Medium |
| 22 | Accessibility gaps | Medium |
| 3 | Prettier absent; indentation defect in `tmdbClient.ts:41` | Low |
| 11 | `FavoritesContext` referenced but absent; live empty page | Low |
| 12 | Favorites/Favourites mixed in UI | Low |
| 13 | Dead exports | Low |
| 14 | Paged envelope types contradict defensive code | Low |
| 15 | Initial-mode logic duplicated | Low |
| 17 | Side effect inside a state updater | Low |
| 18 | `matchMedia` guard inconsistent between call sites | Low |
| 21 | `/dashboard/:id` not marked active | Low |
| 23 | `ExpandableText` observer churn | Low |
| 24 | `isCapped` true at natural end of list | Low |
| 25 | External placeholder image | Low |
| 26 | `Number()` masking a possibly-undefined capture | Low |

### Suggested order

1. **Fix the stale references (#2)** — five-minute edit, and one of them is the build-guard error message.
2. **Add `server/` and `api/` to type-checking and linting (#4)** — the security-relevant code currently has neither.
3. **Add tests for the four high-value targets (#1)** — the proxy's path gate, `format.ts`, `sessionStorage.ts`, `toPagedResult`.
4. **Prettier + CI (#3)** — stops cosmetic drift class from recurring.
5. **Name the API origin variable once (#5)** — removes a genuine dev/prod divergence, which is what this whole branch was about.

Items 6-26 are individually small. None block a release; #22 and #19 are the ones a reviewer at a company would ask about first.