# Routesy Project Audit

**Audit Date:** October 2024  
**Auditor:** Kiro (automated analysis + build/test execution)

---

## Executive Summary

**Overall health score: 7.5 / 10**

Routesy is a well-structured, production-minded full-stack application. Both packages build clean, all 33 tests pass (16 backend, 17 frontend), and no ESLint errors exist. The architecture is sound: proper layering, Zod validation on every endpoint, Helmet, rate limiting, and Prisma-parameterized queries. The three most pressing issues before production are: (1) the `JWT_SECRET` fallback to `'dev-secret'` would silently accept forged tokens in any deployment where the env var is missing; (2) the `vite.config.ts` proxy hardcodes `localhost:3001` which breaks any non-local production build pipeline; and (3) the `travelMode`/`routeMode` columns are plain `String` in the Prisma schema rather than DB-level enums, meaning invalid values can be stored without a migration error.

---

## Critical Issues (must fix before production)

### CRIT-1 — JWT_SECRET fallback to `'dev-secret'`
- **Severity:** Critical
- **Locations:** `packages/backend/src/middleware/auth.ts:28`, `packages/backend/src/routes/auth.ts:32`, `packages/backend/src/routes/auth.ts:65`
- **Description:** All three JWT sign/verify calls use `process.env.JWT_SECRET ?? 'dev-secret'`. Any deployment that forgets to set `JWT_SECRET` silently runs with a publicly-known secret, allowing any attacker to mint valid tokens for any user ID.
- **Fix:** Add a startup assertion in `packages/backend/src/app.ts` (or `index.ts`) that throws when `NODE_ENV !== 'test'` and `JWT_SECRET` is absent or equals `'dev-secret'`. Example:
  ```ts
  if (process.env.NODE_ENV !== 'test' && (!process.env.JWT_SECRET || process.env.JWT_SECRET === 'dev-secret')) {
    throw new Error('JWT_SECRET env var must be set to a strong secret in non-test environments');
  }
  ```
  Then remove all three `?? 'dev-secret'` fallbacks and just use `process.env.JWT_SECRET!`.

---

### CRIT-2 — `vite.config.ts` hardcodes `localhost:3001`
- **Severity:** Critical (deployment blocker)
- **Location:** `packages/frontend/vite.config.ts:9`
- **Description:** The Vite dev-server proxy target is hardcoded as `http://localhost:3001`. This only affects the dev server, but any CI pipeline that runs `vite preview` against a remote backend, or Docker deployments that use Vite's config, will fail silently (requests proxy to localhost on the CI box). The production build itself is fine because the frontend uses `VITE_API_URL` at runtime — but the dev proxy is the only place this hardcode exists.
- **Fix:** Change the proxy target to use the env var:
  ```ts
  proxy: {
    '/api': {
      target: process.env.VITE_API_URL ?? 'http://localhost:3001',
      changeOrigin: true,
    },
  },
  ```

---

## High Priority (should fix soon)

### HIGH-1 — `travelMode` and `routeMode` are plain strings in Prisma schema (no DB enum constraint)
- **Severity:** High
- **Location:** `packages/backend/prisma/schema.prisma:35-36`
- **Description:** Both `travelMode` and `routeMode` are declared as `String` in the schema. The Zod validators (`packages/backend/src/validators/tripValidators.ts`) correctly enforce `z.enum(...)` at the API layer, but if data is ever inserted directly into the DB (via seed, migration, or future code bypassing validation), invalid values will be silently stored. Prisma-level enums (`@map`) would catch this.
- **Fix:** Convert both to Prisma enums:
  ```prisma
  enum TravelMode { driving walking cycling }
  enum RouteMode  { manual optimized }
  model Trip {
    travelMode TravelMode @default(driving)
    routeMode  RouteMode  @default(manual)
  }
  ```
  Generate a new migration.

---

### HIGH-2 — Missing indexes on `Stop.tripId` and `Trip.sessionId`
- **Severity:** High  
- **Locations:** `packages/backend/prisma/schema.prisma`, `packages/backend/prisma/migrations/20261009084453_init/migration.sql`
- **Description:** The `Stop.tripId` foreign key has no explicit index (Prisma does NOT auto-create indexes on FK columns — only unique constraints and `@id` get indexes). Every query that fetches stops by `tripId` does a sequential scan. With many stops/trips, this will degrade. Similarly, `Trip.sessionId` is queried in every GET/POST/PUT/DELETE without an index.
- **Fix:** Add to the schema:
  ```prisma
  model Stop {
    @@index([tripId])
  }
  model Trip {
    @@index([sessionId])
    @@index([ownerId])
  }
  ```
  Then generate and run a migration.

---

### HIGH-3 — `CORS` origin hardcodes `localhost:5173` as fallback
- **Severity:** High
- **Location:** `packages/backend/src/app.ts:24`
- **Description:** `origin: process.env.FRONTEND_URL ?? 'http://localhost:5173'` — same pattern as the JWT_SECRET issue. A production deployment missing `FRONTEND_URL` would still accept requests from `localhost:5173`, which may or may not be reachable from the server, but the intent was clearly to restrict origins.
- **Fix:** Add a startup assertion alongside the JWT_SECRET one:
  ```ts
  if (process.env.NODE_ENV === 'production' && !process.env.FRONTEND_URL) {
    throw new Error('FRONTEND_URL must be set in production');
  }
  ```

---

### HIGH-4 — `Explore` nav link points to an unimplemented route `/explore`
- **Severity:** High (broken UI)
- **Location:** `packages/frontend/src/components/Layout.tsx:38-50`
- **Description:** The navigation bar renders an "Explore" link with a `Map` icon that routes to `/explore`. There is no `/explore` route defined in `packages/frontend/src/router/index.tsx` and no `Explore.tsx` page. Clicking it leads to a blank/404 screen.
- **Fix:** Either remove the Explore link until the page is implemented, or add it as a stub route with a "Coming soon" message.

---

### HIGH-5 — `/login` and `/register` routes are referenced but not implemented
- **Severity:** High (broken UI)
- **Location:** `packages/frontend/src/pages/Settings.tsx:103,110`
- **Description:** Settings.tsx renders `<Link to="/login">` and `<Link to="/register">` but neither route exists in the router. The backend auth endpoints (`/api/auth/register`, `/api/auth/login`) are fully implemented, but there are no frontend pages to use them.
- **Fix:** Implement `Login.tsx` and `Register.tsx` pages and add their routes to `router/index.tsx`. Until then, remove or disable those links.

---

### HIGH-6 — `useStops` hook makes a duplicate API call
- **Severity:** High (performance + correctness)
- **Location:** `packages/frontend/src/hooks/useStops.ts:30`
- **Description:** `useStops` calls `api.get('/api/trips/${tripId}')` to get stops — the same endpoint that `useTrip` already calls in `TripPlanner.tsx`. In `TripPlanner`, both `useTrip(tripId)` and `useStops(tripId)` are mounted simultaneously, resulting in two identical `GET /api/trips/:id` requests on every page load and every refetch. The stops are already embedded inside the trip response.
- **Fix:** Either (a) have `useStops` accept stops as a prop from `useTrip`, or (b) have `useTrip` return stops from the trip object and eliminate `useStops`'s own fetch. Option (b) is cleaner given the current API design.

---

## Medium Priority (improve when time allows)

### MED-1 — `GeocodingService` User-Agent still says `Routeora/1.0`
- **Severity:** Medium (wrong branding, Nominatim ToS compliance)
- **Location:** `packages/backend/src/services/GeocodingService.ts:29`
- **Description:** The HTTP `User-Agent` header sent to Nominatim reads `'Routesy/1.0 (contact@routesy.app)'`. The email `contact@routesy.app` is a placeholder that doesn't exist. Nominatim's ToS requires a valid contact URL/email for rate limiting accountability.
- **Fix:** Change to an actual contact email or deployment URL, e.g. `'Routesy/1.0 (https://routesy.app)'`.

---

### MED-2 — Route geometry merge for large routes is incorrect
- **Severity:** Medium
- **Location:** `packages/backend/src/services/RoutingService.ts:82-91`
- **Description:** `calculateLargeRoute` (for trips with >25 stops) merges segments by only keeping the geometry from the first segment (`segments[0]?.geometry`). All subsequent segments' geometries are discarded. The polyline drawn on the map for a large trip will only show the first 25 stops' path.
- **Fix:** Merge the `coordinates` arrays from all segment geometries into a single GeoJSON LineString, taking care to de-duplicate the overlap point between segments.

---

### MED-3 — `isOwner` function is duplicated across 4 route files
- **Severity:** Medium (code duplication)
- **Locations:** `stops.ts`, `trips.ts`, `sharing.ts`, `route.ts` — all define an identical `isOwner()` function
- **Description:** The same ownership-check helper is copy-pasted verbatim into four route handlers. A bug fix must be applied in all four places.
- **Fix:** Extract to `src/utils/ownership.ts` and import it in each route file.

---

### MED-4 — TypeScript: `noUnusedLocals` and `noUnusedParameters` are `false` in frontend `tsconfig.json`
- **Severity:** Medium
- **Location:** `packages/frontend/tsconfig.json:14-15`
- **Description:** Both flags are explicitly set to `false`. The ESLint rule `@typescript-eslint/no-unused-vars` is set to `error`, which partially compensates, but it doesn't catch unused type parameters or variables that ESLint can't see. Setting these to `true` (or removing them, since they default to `true` when `strict: true`) would catch more dead code at compile time.
- **Fix:** Remove or set both to `true` in `tsconfig.json`.

---

### MED-5 — `buildGoogleMapsUrl` is duplicated on frontend and backend
- **Severity:** Medium (maintenance overhead)
- **Locations:** `packages/backend/src/utils/navigationUrl.ts`, `packages/frontend/src/utils/navigationUrl.ts`
- **Description:** Both files implement the same `buildGoogleMapsUrl` function with slightly different internal variable names but identical output. The comment in the frontend says "Duplicated intentionally to avoid a network call", but since the function is pure and used only on the frontend in `TripNavigate.tsx` and `ShareView.tsx`, the backend copy is unused by the frontend at runtime.
- **Fix:** If the backend's copy is not called by any backend route (confirmed: it is not — the backend `navigationUrl.ts` is imported nowhere in routes), remove it from the backend. If future API endpoints need to return a navigation URL, re-add it then.

---

### MED-6 — `useGeocoding` hook hardcodes the `routesy-session-id` localStorage key
- **Severity:** Medium
- **Location:** `packages/frontend/src/hooks/useGeocoding.ts:54`
- **Description:** The geocoding hook uses raw `localStorage.getItem('routesy-session-id')` instead of going through the `api` utility's `getSessionId()` function. The `api.ts` module already has a `SESSION_ID_KEY = 'routesy-session-id'` constant, but it's not exported. If the key name ever changes, `useGeocoding` won't be updated automatically.
- **Fix:** Export `SESSION_ID_KEY` from `api.ts` and use it in `useGeocoding.ts`, or route all geocoding calls through the `api` object.

---

### MED-7 — No `prisma:generate` in the `build` script
- **Severity:** Medium (CI/CD risk)
- **Location:** `packages/backend/package.json`
- **Description:** `"build": "tsc"` does not run `prisma generate` first. In a fresh CI environment with no cached `node_modules/.prisma`, the TypeScript compile step will fail because the Prisma client types haven't been generated yet. The `prisma:generate` script exists but is not wired into `build`.
- **Fix:** Change build to `"build": "prisma generate && tsc"` or add a `"prebuild": "prisma generate"` script.

---

### MED-8 — `useRoute` hook does not load the existing cached route on mount
- **Severity:** Medium (UX gap)
- **Location:** `packages/frontend/src/hooks/useRoute.ts`
- **Description:** The `useRoute` hook starts with `routeCache: null` and only populates it when `calculateRoute()` or `optimizeRoute()` is called. When a user returns to a trip that already has a cached route, the map polyline won't be displayed until they manually recalculate. The `useTrip` hook already fetches the full trip (which includes `routeCache` in its `include` clause), but `useRoute` ignores this.
- **Fix:** Either (a) make `TripPlanner` pass `trip.routeCache` into the route display directly rather than through `useRoute`, or (b) add a `GET /api/trips/:id/route` call in `useRoute`'s `useEffect` to populate on mount.

---

### MED-9 — `docker-compose.yml` uses default `routesy:routesy` credentials
- **Severity:** Medium (acceptable for dev, bad for production)
- **Location:** `docker-compose.yml:8-10`
- **Description:** The compose file uses `POSTGRES_USER: routesy` / `POSTGRES_PASSWORD: routesy`. These are dev credentials, but if someone accidentally deploys the compose file to production without changing them, the database is easily guessed.
- **Fix:** Add a comment above those fields: `# ⚠️ Change these credentials for production deployments`. Also note in README that these must not be used in production.

---

## Low Priority / Nice to Have

### LOW-1 — `console.log` in `index.ts` is a lint warning
- **Severity:** Low
- **Location:** `packages/backend/src/index.ts:6`
- **Description:** `console.log(\`Routesy API listening on port ${PORT}\`)` triggers the `no-console` ESLint warning (currently set to warn, not error). Harmless but untidy.
- **Fix:** Change to `console.info(...)` which is allowed by the ESLint config, or suppress with `// eslint-disable-next-line no-console`.

---

### LOW-2 — `useGeocoding` does not clean up AbortController on unmount
- **Severity:** Low
- **Location:** `packages/frontend/src/hooks/useGeocoding.ts:76-80`
- **Description:** The hook comment acknowledges that AbortController cleanup is "handled at the component level by calling search('') or clearResults", but no component actually does this cleanup on unmount. An in-flight geocoding request could complete after a component unmounts and attempt to set state on an unmounted component. React 18 suppressed the warning but the leaked async operation is still real.
- **Fix:** Add a `useEffect` cleanup return in `useGeocoding` that calls `abortControllerRef.current?.abort()` on unmount.

---

### LOW-3 — `useShare.ts` hook exists but is unused
- **Severity:** Low (dead code)
- **Location:** `packages/frontend/src/hooks/useShare.ts`
- **Description:** There is a `useShare` hook file but the `TripPlanner` page implements share logic inline (directly calling `api.post/del`) rather than through this hook. The hook is never imported anywhere.
- **Fix:** Either refactor `TripPlanner` to use `useShare`, or delete the file.

---

### LOW-4 — `Settings.tsx` uses `window.location.reload()` for logout
- **Severity:** Low
- **Location:** `packages/frontend/src/pages/Settings.tsx:17-20`
- **Description:** After removing tokens from localStorage, the logout handler calls `window.location.reload()`. This is noted in a comment as "keeps it simple for now" but it's a hard page reload that loses all React state. A navigation to `/` via `useNavigate()` would be smoother.
- **Fix:** Replace `window.location.reload()` with `navigate('/')` after clearing localStorage.

---

### LOW-5 — `vitest` CJS deprecation warning in backend tests
- **Severity:** Low
- **Location:** `packages/backend`
- **Description:** Running `npm test` in the backend prints: `The CJS build of Vite's Node API is deprecated`. This is a Vitest version issue (1.3.1 uses the CJS API internally on Node). It doesn't affect test results but pollutes CI logs.
- **Fix:** Upgrade vitest to ≥2.x in both packages (note: this is a semver major upgrade; check for breaking changes first). Or, in the short term, add `VITE_CJS_IGNORE_WARNING=true` to the test environment.

---

### LOW-6 — Missing `aria-label` on drag handles in StopList
- **Severity:** Low (accessibility)
- **Location:** `packages/frontend/src/components/trip/StopList.tsx:80-88`
- **Description:** The `draggable` div wrapping each stop card has no `role` or `aria-label`. Screen readers cannot announce that items are reorderable. HTML5 native drag-and-drop is also not keyboard-accessible.
- **Fix:** Consider adding `aria-roledescription="Reorderable stop"` and `aria-label="Drag to reorder"` to the draggable wrapper, or add a keyboard-accessible reorder mechanism (move-up/move-down buttons as an alternative to drag).

---

## What's Working Well

1. **Security architecture is solid.** Helmet.js is enabled, CORS is configurable, rate limiting is applied globally + per-geocoding-endpoint, and Prisma parameterizes all queries (no SQL injection risk). The `buildPublicTripPayload` function correctly strips `ownerId`, `sessionId`, `owner.email`, and `owner.password` — confirmed by the security test in `trips.test.ts`.

2. **TypeScript strictness.** Both packages use `"strict": true`. The backend build runs `tsc` with zero errors. No `any` types found in route handlers or services.

3. **Validation coverage.** Every mutating endpoint has a Zod schema: `RegisterSchema`, `LoginSchema`, `CreateTripSchema`, `UpdateTripSchema`, `CreateStopSchema`, `UpdateStopSchema`, `ReorderStopsSchema`. Validation errors return structured 422 responses via the global `errorHandler`.

4. **Cascading deletes are correctly configured.** `Stop` has `onDelete: Cascade` on its `tripId` FK, and `RouteCache` has the same — so deleting a trip correctly removes all child records in one database operation.

5. **Mobile layout is genuinely implemented.** `TripPlanner` has a real collapsible bottom panel for mobile (`md:hidden`) with its own action buttons and stop list, not just a scaled-down version of the desktop view. Touch targets are ≥44px throughout the navigation components.

6. **Geocoding is properly debounced.** `useGeocoding` uses a 300ms debounce + AbortController to cancel in-flight requests when the user types faster. The backend also enforces a 1-second rate limit between Nominatim requests.

7. **Route recalculation is triggered only on `dragEnd`.** `StopList.tsx` calls `onReorder` only in `handleDragEnd`, not in `handleDragOver`. This matches the spec.

8. **Share token entropy is sufficient.** `nanoid(21)` with a 64-character alphabet = ~126 bits of entropy. That exceeds the OWASP session token recommendation and is brute-force infeasible.

9. **All 7 pages are real implementations.** Landing, Trips, NewTrip, TripPlanner, TripNavigate, ShareView, and Settings all have full implementations (no stubs or placeholder content). The router uses `React.lazy()` + `Suspense` for code-splitting.

10. **`isOwner` covers both session and authenticated modes correctly.** All five route files that modify resources check ownership by `userId || sessionId`, so guest users retain full control of their trips across browser sessions as long as localStorage is intact.

---

## Test Results

| Package | Test File | Tests | Passed | Failed |
|---------|-----------|-------|--------|--------|
| backend | `src/tests/utils.test.ts` | 9 | 9 | 0 |
| backend | `src/tests/trips.test.ts` | 7 | 7 | 0 |
| frontend | `src/tests/components.test.tsx` | 17 | 17 | 0 |
| **Total** | | **33** | **33** | **0** |

**Backend test coverage:**
- ✅ `buildGoogleMapsUrl` — 5 tests covering all travel modes and coordinate encoding
- ✅ `generateShareToken` — 3 tests (length, type, uniqueness)
- ✅ Reorder sequence logic — 1 unit test
- ✅ `POST /api/trips` — creation + validation failure
- ✅ `GET /api/trips/:id` — success + 404
- ✅ `GET /api/share/:token` — security test confirming no email/password leak
- ✅ `DELETE /api/trips/:id` — owner deletion + 403 on session mismatch

**Frontend test coverage:**
- ✅ `TripCard` — renders name, stop count, action buttons
- ✅ `ProgressBar` — ARIA attributes, clamping, label
- ✅ `Button` — children, loading state, disabled, variants
- ✅ `Badge` — all 5 variants checked for class names

**Coverage gaps (not tested):**
- `useTrip`, `useStops`, `useRoute`, `useGeocoding`, `useProgress` hooks (no tests)
- `stops.ts` routes (reorder, visit, skip, delete endpoints)
- `sharing.ts` routes (enable/disable/regenerate share)
- `geocoding.ts` route
- Auth routes (register, login, `/me`)
- All 7 page components (no page-level integration tests)
- `buildPublicTripPayload` edge cases (e.g., owner present but no email field)

---

## Dependency Vulnerabilities

`npm audit` reports **36 vulnerabilities** (4 low, 8 moderate, 21 high, 3 critical):

| Severity | Count | Key Packages |
|----------|-------|--------------|
| Critical | 3 | `tinypool` ≤2.1.1 — Prototype Pollution → RCE in vitest worker options |
| High | 21 | `express@4.18.2` via `send` < 0.19.0 — XSS via template injection in error pages; `qs` via `express` |
| Moderate | 8 | Various transitive dependencies |
| Low | 4 | Various transitive dependencies |

**Actionable fixes:**
1. **Upgrade vitest to ≥1.6.1** (or latest 2.x) to resolve the `tinypool` critical RCE. Both packages pin `vitest: 1.3.1` and `@vitest/coverage-v8: 1.3.1`.
2. **Upgrade express to ≥4.22.3** to resolve the `send` XSS vulnerability. Current: `express: 4.18.2`.

Note: `npm audit fix` cannot resolve these automatically without `--force` (breaking version changes). Manual version bumps are needed.

---

## Recommendations Summary Table

| # | Severity | File(s) | Issue | Fix |
|---|----------|---------|-------|-----|
| CRIT-1 | Critical | `auth.ts`, `middleware/auth.ts` | JWT_SECRET falls back to `'dev-secret'` | Startup assertion + remove fallback |
| CRIT-2 | Critical | `vite.config.ts` | Localhost:3001 hardcoded in proxy | Use `VITE_API_URL` env var |
| HIGH-1 | High | `schema.prisma` | `travelMode`/`routeMode` are plain strings | Convert to Prisma enums |
| HIGH-2 | High | `schema.prisma`, migration | No index on `Stop.tripId`, `Trip.sessionId` | Add `@@index` directives + migration |
| HIGH-3 | High | `app.ts` | CORS origin falls back to localhost | Startup assertion in production |
| HIGH-4 | High | `Layout.tsx`, `router/index.tsx` | `/explore` nav link broken (no route/page) | Remove link or add stub page |
| HIGH-5 | High | `Settings.tsx`, `router/index.tsx` | `/login` and `/register` links broken | Implement pages or remove links |
| HIGH-6 | High | `useStops.ts`, `TripPlanner.tsx` | Double API call on mount | Share trip data from `useTrip` |
| MED-1 | Medium | `GeocodingService.ts` | User-Agent email is placeholder | Set real contact URL |
| MED-2 | Medium | `RoutingService.ts` | Large route geometry merge discards segments 2+ | Merge all coordinates arrays |
| MED-3 | Medium | 4 route files | `isOwner` duplicated verbatim | Extract to `src/utils/ownership.ts` |
| MED-4 | Medium | `frontend/tsconfig.json` | `noUnusedLocals/Parameters: false` | Set to `true` |
| MED-5 | Medium | `backend/utils/navigationUrl.ts` | `buildGoogleMapsUrl` unused in backend | Delete from backend |
| MED-6 | Medium | `useGeocoding.ts` | Hardcoded localStorage key | Use exported constant from `api.ts` |
| MED-7 | Medium | `backend/package.json` | `build` doesn't run `prisma generate` | Add `prisma generate &&` to build script |
| MED-8 | Medium | `useRoute.ts` | Existing route cache not loaded on mount | Fetch or pass from `useTrip` |
| MED-9 | Medium | `docker-compose.yml` | Default dev credentials | Add prominent warning comment |
| LOW-1 | Low | `index.ts` | `console.log` lint warning | Change to `console.info` |
| LOW-2 | Low | `useGeocoding.ts` | AbortController not cleaned up on unmount | Add `useEffect` cleanup |
| LOW-3 | Low | `useShare.ts` | Hook file unused | Use it or delete it |
| LOW-4 | Low | `Settings.tsx` | `window.location.reload()` for logout | Use `useNavigate('/')` |
| LOW-5 | Low | Both packages | Vitest CJS deprecation warning | Upgrade vitest to ≥2.x |
| LOW-6 | Low | `StopList.tsx` | Drag-and-drop not keyboard accessible | Add ARIA + keyboard alternative |
| DEP | Critical | `packages/*/package.json` | `tinypool` RCE + `express` XSS via old `send` | Upgrade vitest ≥1.6.1, express ≥4.22.3 |

---

*Report generated from static analysis, `npm test`, `npm run lint`, `npm run build`, and `npm audit` outputs. No live database connection was available; Prisma query behavior is assessed from schema + code review only.*
