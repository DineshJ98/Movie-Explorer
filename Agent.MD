# AI Agent Context & Guardrails: Movie Explorer App

This file serves as the strict operational context and single source of truth for the AI assistant supporting the development of this application.

**Progress is tracked in `tasks.md` at the project root.** Read it before starting work, and update its status block and checkboxes when a phase completes. That file has a *Where We Are* section at the top with the phase list and the next starting point.

### Current Build State

Phases 0 through 5 are complete and verified. **TMDB session auth is wired end to end**
using TMDB's password-free redirect flow, and protected routes are gated.
**Phase 6, account-backed favourites, is next** — the last real feature, and the reason
auth was promoted ahead of it.

`FavoritesPage` is the last placeholder, and the favourites button on the details page is
still a disabled stub waiting for the account API.

**One step cannot be automated:** the approval click on themoviedb.org needs a real human
account. Everything before and after it is verified. First manual run: `pnpm dev` → "Sign
in with TMDB" → confirm you return to `/dashboard` with your avatar in the bar.

## Active Project Status

- **Core Objective:** Build a production-grade, highly responsive Movie Explorer Web App.
- **Architecture Strategy:** Explicit page-based routing with structural code isolation. All presentation layouts must scale gracefully across mobile, tablet, and desktop breakpoints using fluid layout principles.
- **State Management Strategy:** Global system data brokered using React Context API layer instances to decouple data orchestration from presentational layouts.
- **Build Order (mandatory):** Routing First → Page-by-Page Construction → Auth Last. Do not begin a later phase before the current one passes its exit criteria.

## Hard Tech Stack Constraints

- **Frontend Scaffolding:** Vite (`react-ts` template). The project is already scaffolded — do not run `create-react-app` or re-initialize.
- **Language:** TypeScript in `strict` mode, with explicit interface models for all API payloads. `tsconfig.app.json` already sets `strict`, `noUncheckedIndexedAccess`, and `noImplicitOverride`. Do not relax these.
- **Visual Components:** Material-UI (MUI) with a global `ThemeProvider` supporting light and dark modes. The installed version is **MUI v9**. See *MUI v9 Gotchas* below before using any MUI API.
- **Visual Design:** Neutral grey surfaces with a **single blue accent** (`#1d6fe0` light, `#64a0f5` dark). There is deliberately **no secondary hue** — a second accent competes with the first on a dense poster grid. Blue is reserved for primary actions and active navigation state. Do not introduce additional accent colours.
- **Data Transport:** A single configured Axios instance in `src/api/tmdbClient.ts`. No component may import Axios directly.
- **Navigation Engine:** `react-router-dom` with data routing (`createBrowserRouter`). The installed version is **v7**; the API surface used by this project (`createBrowserRouter`, `Navigate`, `Outlet`, `scrollRestoration`) is unchanged from v6.
- **Data Source:** The Movie Database (TMDB) API v3 endpoints.

## Environment Variables

Vite only exposes env vars prefixed with `VITE_`. Any variable without that prefix resolves to `undefined` at runtime without warning, so all three are typed in `src/vite-env.d.ts` to turn that failure mode into a compile error.

| Variable | Purpose |
|---|---|
| `VITE_TMDB_TOKEN` | TMDB **v4 "API Read Access Token"** (not the v3 API key), sent as an `Authorization: Bearer <token>` header. |
| `VITE_TMDB_IMAGE_BASE` | Base URL for TMDB image assets, no trailing slash. |
| `VITE_TMDB_API_ORIGIN` | Origin the Vite dev proxy forwards to. |

- Secrets live in `.env.local` only. `.env` and `.env.*` are git-ignored with an explicit `!.env.example` allowlist entry. **Never commit a real token, and never paste one into a source file, a component, or a chat message.**
- `.env.example` documents every variable with empty placeholders and is the file a new developer copies.

## Explicit Route Mapping

The application uses these exact client-side routes:

- `/login` → Unauthenticated portal mapping user access validation challenges.
- `/dashboard` → Unified workspace dashboard displaying trending arrays by default and switching dynamically to show matching queries.
- `/dashboard/:id` → Dedicated deep-link details template parsing item metadata properties.
- `/favorites` → Standalone catalog ledger listing persistent user bookmarks.
- `/auth/callback` → **Added.** The landing route TMDB redirects to after a user approves a request token. It cannot be removed: the redirect flow depends on it.

Routes must resolve to real content when entered directly by URL. A cold page load on `/dashboard/:id` with no prior in-memory state has to render fully — never read detail data from a previously-fetched list.

## Engineering Assumptions & MVP Trade-Offs

To deliver a solid MVP within a rapid timeframe, the assistant must follow these deliberate trade-offs:

1. **Direct API Gateways:** Skip setting up full intermediate proxy networks or backend microservices for now. Fetch assets directly via local client configuration variables (`VITE_TMDB_TOKEN`) injected cleanly using Authorization Bearer headers. In development, `vite.config.ts` proxies `/tmdb/*` to `/3/*` on the TMDB origin so the token never appears as a URL parameter.
2. **TMDB Native Authentication:** Users authenticate against **TMDB's real user database** using the official request-token session pipeline. Do **not** build a local mock auth, do not hardcode credentials, and do not collect a TMDB username or password in this app. TMDB marks the password-based `validate_with_login` flow as *strongly discouraged* precisely because it pushes a real account password through the frontend; the redirect flow is the sanctioned alternative.
3. **Account-Backed Favorites:** The watchlist is stored on the user's TMDB account via `/account/{account_id}/favorite`, not in `localStorage`. Favorites are therefore **account-scoped and sync across devices**. Any local storage is a read-through cache only and must never be treated as the source of truth, or a logout/login-as-another-user on the same browser would leak the previous account's favorites.
4. **UX Strategy Shift:** Use clean "Load More" pagination patterns at the bottom of grids instead of complex infinite scroll tracking blocks to ensure maximum architectural stability.

## MUI v9 Gotchas (verified against the installed package)

These were found by running the installed code. Each fails **silently** or with a confusing error, so check this list before reaching for a familiar MUI pattern.

- **`theme.vars` requires an explicit `cssVariables: true`.** It is not the v9 default. Without it `theme.vars` is `undefined` and every `theme.vars.*` override quietly falls back to defaults.
- **Do not use dual-mode `colorSchemes` for this app.** It leaves `theme.palette.mode` stuck at `'light'` no matter which mode is active; the real mode is only reachable through `useColorScheme()`, which throws outside a `CssVarsProvider`. This project instead calls `buildAppTheme(mode)` twice and lets `ThemeContext` own the mode. `src/theme/theme.ts` and `src/context/ThemeContext.tsx` implement this.
- **`Stack` no longer takes flexbox props directly.** `alignItems`, `justifyContent`, `flexGrow`, and similar must be passed through `sx`. `direction` and `spacing` are the only remaining direct props.
- **`AppBar` defaults to `position: 'fixed'` and `color: 'primary'`.** Both are wrong for this design; the component sets `sticky` and `default` explicitly. Never remove those props.
- **Never export a hook from a file that also exports a component.** It breaks `react-refresh` and the lint rule catches it. The theme context and its hook are split across `ThemeContext.tsx` and `themeContextValue.ts` for this reason.

> Earlier drafts of this file asserted v9 behaviours from recollection and were wrong on two counts. **Verify any API claim against the installed package before relying on it.**

## TMDB API Gotchas (verified live, 2026-09-29)

These were found by calling the real API, not by reading documentation. Each one produces a wrong result with no error message.

- **An empty search returns `total_pages: 1` with zero results.** Never derive "has more" from `page < total_pages` alone — a Load More button built that way spins forever. `movieService.toPagedResult` guards with `items.length > 0 && page < totalPages`. Do not reintroduce the naive check.
- **Trending reports 500 pages.** Load More is effectively unbounded. The dashboard caps pages and shows an end-of-list message.
- **List and detail movie shapes are not interchangeable.** List items carry `genre_ids: number[]`; the detail endpoint carries `genres: TmdbGenre[]`. There are two separate types for this reason.
- **`GET /authentication/token/new` — the verb is GET.** POST returns `{ "success": false }` with no explanation.
- **`DELETE /authentication/session` takes `session_id` as a query param.** TMDB's own docs show a JSON body; that form returns **405**.
- **Favorite endpoints are asymmetric.** Writes go to `POST /account/{id}/favorite`, reads come from `GET /account/{id}/favorite/movies`. The write has no `/movies` suffix.
- **A missing id returns HTTP 404** with `{ status_code: 34 }`. The client maps this to the `TMDB_NOT_FOUND` marker.

> Token handling: `src/api/tmdbClient.ts` warns once at module load if `VITE_TMDB_TOKEN` is absent, and tags failures with exported constants (`TMDB_UNAUTHORIZED`, `TMDB_NOT_FOUND`, `TMDB_MISSING_TOKEN`). Branch on those constants — never string-match an error message.

## Browser Testing Without Puppeteer or Playwright

Neither library is installed. Do not add one just to verify a page. Drive the browser
directly over the **Chrome DevTools Protocol** using Node's built-in `WebSocket`:

1. `setsid nohup google-chrome --headless=new --no-sandbox --remote-debugging-port=9222 --user-data-dir=/tmp/cprof about:blank &`
2. `curl -s http://127.0.0.1:9222/json/list` to get the page target's `webSocketDebuggerUrl`
3. `Page.navigate`, then `Runtime.evaluate` with `returnByValue: true` to inspect and click

**Use `setsid` plus `</dev/null` and `disown`.** A plain `nohup ... &` gets killed when the
shell command's timeout fires, and the server dies with it.

> **Assert on rendered text, not on the element type you assumed.** Two probes in this
> project reported false negatives: "End of results" is a `Typography` (`<p>`), not a
> `<button>`, and the empty state reads "No movies found", not "No results". Both features
> were working. Before "fixing" a UI bug, confirm the element actually exists with
> `document.body.innerText.includes(...)`.

## Testing Expectations

A first-paint screenshot is not verification of an interactive feature. Load More, search,
and the page cap only get exercised by **actually clicking and typing**. This project shipped
two real bugs that were invisible until the clicks happened: TMDB recycles trending titles
across pages (duplicates), and a one-character query blanked the grid entirely. Test the
interaction, not just the initial render.

## Responsive Bleed Must Track the Container's Real Gutter

To make a full-bleed element inside MUI's `<Container>`, **never hardcode the negative
margin**. `Container` padding is **16px at `xs` and 24px from `sm` up**, so a fixed
`ml: -3` / `calc(100% + 48px)` over-shoots by 8px on a phone and makes the whole page
scroll sideways. Use `mx: { xs: -2, sm: -3 }` and let the block element size itself.

Check overflow at a real mobile width, not just desktop:
`document.documentElement.scrollWidth > document.documentElement.clientWidth`.

## Never Verify a Feature at One Viewport

Read more / line-clamping is the clearest example. TMDB overviews top out near 340
characters, which fits inside 4 lines at 1280px — so the control is correctly **absent**
there. Only at 390px does it overflow. A desktop-only screenshot proves nothing.

Same for `CastList`: its scroll arrows depend on measured overflow, so they exist at one
width and not another. Assert on `scrollWidth > clientWidth`, not on a fixed pixel count.

## When a State Cannot Be Reached, Stub the Response

Some branches are unreachable through the live API. The zero-rating guard could not be
tested: no 0-vote film is reachable via `discover`, `trending`, `search`, or `upcoming`. Rather
than assume the code is right, intercept the request and fulfil it:

```js
await cdp.send('Fetch.enable', { patterns: [{ urlPattern: '*/movie/550*', requestStage: 'Request' }] })
// on Fetch.requestPaused -> cdp.send('Fetch.fulfillRequest', { requestId, responseCode: 200,
//   responseHeaders: [{ name: 'Content-Type', value: 'application/json' }], body: b64 })
```

This exercises the real component, the real hook and the real state machine, only with
synthetic data. `Fetch.disable` when finished.

## React Compiler Lint Rules (these are strict, and they are right)

`eslint-plugin-react-hooks` v7 ships the React Compiler rules. Two of them will reject code that passes in older React projects.

- **`set-state-in-effect`** rejects any `setState` reachable synchronously from an effect body, including through a called function. The fix is **not** to disable the rule. Restructure so the effect only kicks off the async work and every state update happens in a promise callback. `src/context/MovieContext.tsx` is the reference implementation: it calls `fetchPage` from an effect, and all `setState` calls live inside `await`ed callbacks.
- **`exhaustive-deps`** also warns when a derived value used as a `useMemo` dep is a conditional expression, because it gets a new identity each render. Wrap the derivation in its own `useMemo`.

> Deriving staleness during render (`const isFresh = result.term === activeQuery`) is preferable to clearing state in an effect. It satisfies the linter and avoids the cascading render the rule is warning about.

## TMDB Endpoint Behaviour (verified against the live API, 2026-09-29)

- **`trending/movie/week` lies about its size.** It reports `total_pages: 500`, but real data
  ends at **page 10**, which is a short page of 19. Beyond that it recycles earlier titles.
  `MAX_PAGES = 10` in `src/context/MovieContext.tsx` is therefore not arbitrary — it lands
  exactly on the last real page.
- **Trending recycles titles *within* the cap too.** The first 10 pages contain 199 results
  but only 179 unique films. Dedupe by `movie.id` on append or users see repeated cards.
  Never assume a TMDB page boundary means new content.
- **Page counts are not item counts.** A page can return 19 or fewer items, so never assert
  `results.length === 20`; assert `total_pages` or the accumulated total.
- **`GET /authentication/token/new` works; the equivalent POST does not.**
- `DELETE /authentication/session` needs the `session_id` as a **query parameter**, not in
  the body, to revoke a session.
- Do **not** use `validate_with_login` on user endpoints.
- **Movie ids rot.** `/dashboard/1399` (a film that existed in 2024) no longer resolves on
  TMDB and returns no title. Do not hardcode ids in tests or docs without re-checking them.
- **Every optional field really is optional.** Verified against a movie with no video, cast,
  overview, backdrop, poster, genres, runtime or tagline (`id=869908`): `credits.cast` and
  `videos.results` come back absent rather than empty, and `character` is `null` for uncredited
  cast. Guard all of them, and test against a real sparse record, not just a popular film.

## The dev proxy does not exist in production (cost a real bug, 2026-09-30)

`vite.config.ts` proxies `/tmdb` → `api.themoviedb.org/3`. That proxy lives in the dev
server only. A hardcoded `baseURL: '/tmdb'` therefore **silently 404s in any deployed
build**, and it broke sign-in on Vercel because `GET /authentication/token/new` never
reached TMDB. `import.meta.env.DEV` now switches between the proxy and the real origin.

> **Never verify a deployment-sensitive change with `pnpm dev` alone.** Run
> `pnpm build && pnpm exec vite preview` before believing it works; `vite preview` serves
> the real bundle with no dev proxy and no rewrite layer, so it reproduces production.
> Both of the bugs fixed here passed every dev-server test.

A Vite SPA on Vercel also needs `vercel.json` with
`{"rewrites":[{"source":"/(.*)","destination":"/index.html"}]}`. Without it every client
route 404s on a hard load, including `/auth/callback` — the URL TMDB redirects users to.
Vercel evaluates `rewrites` *after* the filesystem check, so hashed `/assets/` files are
still served and only unmatched paths fall through to `index.html`.

`VITE_`-prefixed variables are **inlined at build time**. Adding or changing one requires
a rebuild, not just a redeploy, and a missing token produces a wall of 401s rather than a
build error.

## What is and is not a secret in this app

**The TMDB read token is public, by necessity.** `VITE_`-prefixed variables are inlined
into the client bundle, so `VITE_TMDB_TOKEN` is readable by anyone who views source.
This is unavoidable for a client-side TMDB app — the browser has to make the request. A
v4 Read Access Token can only read public catalogue data; it cannot modify an account or
read a watchlist. Rotate at TMDB → Settings → API if it leaks.

**`session_id` is the real credential, not the token.** It is a write credential for a
user's TMDB account, and it lives in `localStorage` (`STORAGE_KEYS.session`). Anything
running on the origin can read it. This is the accepted trade-off of a no-backend app,
not a bug — but it is why the CSP matters.

`.env.local` is git-ignored via `.gitignore` and was never committed (verified across all
refs). Re-verify with `git log --all -p | grep -cF "$TOKEN"` after any change.

## Content-Security-Policy (added 2026-09-30)

Configured in `vercel.json`, not `index.html`, so it is enforced by the platform and
cannot be forgotten. Test it locally with `pnpm build` plus a static server that applies
the same headers — `vite preview` ignores `vercel.json` entirely.

> **A CSP must be tested by running the app, never by reading it.** The first draft
> silently broke the trailer embed: `frame-src` was unset, so it fell back to
> `default-src 'self'` and blocked `youtube-nocookie.com` on every movie page. It is
> invisible in review and only shows up in a browser. Any new outbound origin — an image
> host, a font CDN, an embed — needs a matching directive.

The pre-paint theme script in `index.html` was moved to `public/theme-init.js` so that
`script-src` could stay `'self'` with no `'unsafe-inline'`. A classic script in `<head>`
(no `type=module`, no `async`/`defer`) still blocks parsing and runs before paint, so
the no-flash behaviour is unchanged. **Do not inline a script back into `index.html`** —
it will silently force `'unsafe-inline'` onto the one directive that matters.

`style-src` does need `'unsafe-inline'`: MUI injects styles at runtime. That is
acceptable — `style-src` is far less dangerous than `script-src`.

## TMDB Auth Endpoints (all verified live, 2026-09-29)

- `GET /authentication/token/new` works. **`POST` to the same path returns
  `{ success: false, status_code: 34 }`** with no token, despite some examples showing POST.
- **`GET /account` without `session_id` returns 200 with the *API key's own* account**, not
  an error. Omitting the parameter silently signs the user in as the token owner. Always
  send it.
- `POST /authentication/session/new` with an unapproved or already-spent token returns
  **HTTP 401** with `{ status_code: 17, "Session denied." }`. A mismatched token can instead
  return **HTTP 200** with `success: false`. Check both — neither the status code nor the
  `success` flag alone is sufficient.
- `DELETE /authentication/session` requires `session_id` as a **query parameter**. Omitting
  it returns 400 "Invalid parameters", and the body form is rejected even though TMDB's docs
  show one. Always revoke server-side on logout.
- `account.avatar.tmdb.avatar_path` is `null` when no avatar is uploaded, and
  `account.name` is frequently `""` even when `username` is set. Always have a fallback.

> **A shared Axios interceptor can corrupt the meaning of an error.** The interceptor in
> `tmdbClient.ts` rewrites every 401/403 to `TMDB_UNAUTHORIZED`. That is correct for data
> fetches but wrong for auth: a user who declined approval was told to check
> `VITE_TMDB_TOKEN`. Endpoint-specific errors must be re-labelled at the call site
> (`createSession` maps 401 to `SESSION_DENIED`) rather than trusting the global mapping.

## Session Storage Is Untrusted Input

`readStoredSession` validates every field and discards a malformed entry. A user can edit
localStorage at will, and `session_id` is a **write credential for a real account** — a
garbage value would fail confusingly on the first `/account` call, and a stale one would
loop forever if not cleared. Only the five fields in `StoredSession` are ever written.

Router `location.state` does **not** survive the tmdb.org round trip, so the post-login
destination is persisted separately. Validate it with `/^\/(?!\/)/` so a crafted entry
cannot turn the callback into an open redirect.

## A client-side SPA cannot keep a secret from its own user

Do not describe this auth flow as production-grade security. The `session_id` lives in
localStorage, and the person using the app can read it. It is the correct flow for this
project, not a hardened one. Keep the session out of logs and analytics, and revoke it
server-side on logout. Never switch to `validate_with_login`: it is strongly discouraged
by TMDB precisely because it pushes a real account password through the frontend.

## Type Safety Expectations

- Define explicit interfaces for all TMDB payloads in `src/types/tmdb.ts`. Every field is optional except `id` and `title` — TMDB omits fields silently, and a naive strict model will crash on a null `poster_path`.
- The service layer returns a normalized `PagedResult<T>` so that the grid, search, and favorites views all consume one shape. When TMDB renames a field, change one mapper, not four components.
- Model asynchronous state as discriminated unions (`'idle' | 'loading' | 'loading-more' | 'success' | 'error'`) rather than parallel booleans, so a "load more" spinner stays distinct from a full-grid load.
- Validate route params with `Number.isInteger` before passing them to the service layer.

## AI Interaction Guidelines

- **Do Not Write Multi-File Boilerplate Unsolicited:** Provide precise, incremental updates focused on one file or layout section at a time.
- **Keep Code Production-Ready:** Write fully realized code modules. Do not truncate components with placeholder comments like `// implement later`.
- **Focus on Simplicity First:** Prioritize clean, readable, and highly maintainable components over overly clever optimizations.
- **Verify Every Phase:** Run `pnpm lint` and `pnpm build` after each phase. The `tsc -b` step in the build script is the strict-mode gate — a green dev server is not evidence that types are correct.
- **One Concern, One File:** Do not mix a component and a hook in the same module — the theme context is split for this reason. Keep services (`src/api/`) free of React imports, and contexts free of JSX-heavy logic.
- **Theme Mode Lives in Context:** the active light/dark mode is owned by `ThemeContext`, not by MUI. Read it with `useThemeMode()` from `src/context/themeContextValue.ts`. Do not call `useColorScheme()`.
- **Debounce at the Source:** Debounce the query inside the context, not the results inside a component. Debouncing at the consumer level is the classic mistake that still lets a fast typist fire a burst of requests.
- **Cancel In-Flight Requests:** Every request must accept an `AbortController` signal so unmounts and query changes do not write state or let a slow earlier response overwrite a faster later one.
- **Treat `session_id` as a credential:** It grants write access to a real TMDB account. Never log it, never send it to analytics, and always destroy it server-side via `DELETE /authentication/session?session_id=...` on logout rather than merely clearing local state. Note that TMDB's docs show this call taking a JSON body, but the body form returns **405** — the query param is what works.
- **Be Honest About Auth Posture:** A client-side SPA cannot keep a secret from the person it is authenticating. Do not describe this flow as production-grade security, and do not present it as protecting the user's TMDB account.
