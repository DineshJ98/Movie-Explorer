# AI Agent Context & Guardrails: Movie Explorer App

This file serves as the strict operational context and single source of truth for the AI assistant supporting the development of this application.

**Progress is tracked in `tasks.md` at the project root.** Read it before starting work, and update its status block and checkboxes when a phase completes. That file has a *Where We Are* section at the top with the phase list and the next starting point.

### Current Build State

Phases 0, 1, and 2 are complete and verified. The app boots, all routes render, dark mode is confirmed working, and the service layer is proven against the **live TMDB API** (trending, search, details, 404 handling, and image URLs all asserted against real responses). **Phase 3, the `/dashboard` trending grid with search, is next** — it is the first phase that puts real data on screen.

**No page renders real data yet.** The services in `src/api/` are built and tested, but only a temporary probe called them, and that probe was removed after verification.

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
