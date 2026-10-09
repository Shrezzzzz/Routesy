# Implementation Plan — Routesy Pre-Production

> Authoritative source of truth for the coder loop. Each item is independently verifiable.
> All commands run from the workspace root `/Users/shrezzzzz/Documents/Code/Routesy` unless noted.
> Never run `prisma migrate reset` or `prisma db push --force-reset`. Never delete migration files.

---

## FEAT-001 — Security Fixes, Audit Remediations, and Backend Hardening

- [ ] 1. **JWT_SECRET and FRONTEND_URL startup guards** — Add two startup assertions in `packages/backend/src/app.ts` (at the top, before the `const app = express()` line):
  ```ts
  if (process.env.NODE_ENV !== 'test' && (!process.env.JWT_SECRET || process.env.JWT_SECRET === 'dev-secret')) {
    throw new Error('JWT_SECRET env var must be set to a strong secret in non-test environments');
  }
  if (process.env.NODE_ENV === 'production' && !process.env.FRONTEND_URL) {
    throw new Error('FRONTEND_URL must be set in production');
  }
  ```
  Then remove all three `?? 'dev-secret'` fallbacks: in `packages/backend/src/middleware/auth.ts` line 28 and in `packages/backend/src/routes/auth.ts` lines 32 and 65 — change to `process.env.JWT_SECRET!`.
  Files: `packages/backend/src/app.ts`, `packages/backend/src/middleware/auth.ts`, `packages/backend/src/routes/auth.ts`
  Verify: `cd packages/backend && npm test` — all 16 tests pass (tests run with `NODE_ENV=test` so the guard does not fire).

- [ ] 2. **Vite proxy fix** — In `packages/frontend/vite.config.ts`, change proxy target from `'http://localhost:3001'` to `process.env.VITE_BACKEND_URL ?? 'http://localhost:3001'`.
  Files: `packages/frontend/vite.config.ts`
  Verify: `cd packages/frontend && npm run build` — builds clean.

- [ ] 3. **Dependency upgrades** — In `packages/backend/package.json`, bump `"express"` to `"4.22.3"`, `"vitest"` to `"1.6.1"`, `"@vitest/coverage-v8"` to `"1.6.1"`. In `packages/frontend/package.json`, bump `"vitest"` to `"1.6.1"`, `"@vitest/coverage-v8"` to `"1.6.1"`. Then run `npm install` at the workspace root to update `package-lock.json`.
  Files: `packages/backend/package.json`, `packages/frontend/package.json`
  Verify: `npm test` (root) — all 33 tests pass. `npm run build` (root) — both packages build.

- [ ] 4. **Extract isOwner utility** — Create `packages/backend/src/utils/ownership.ts`:
  ```ts
  export function isOwner(
    trip: { ownerId: string | null; sessionId: string | null },
    userId: string | null | undefined,
    sessionId: string | null | undefined
  ): boolean {
    if (userId && trip.ownerId === userId) return true;
    if (sessionId && trip.sessionId === sessionId) return true;
    return false;
  }
  ```
  Delete the local `isOwner` function definition from `routes/trips.ts`, `routes/stops.ts`, `routes/sharing.ts`, and `routes/route.ts`. Add `import { isOwner } from '../utils/ownership';` to each. The `loadAndAuthorizeTrip` helper in `stops.ts` calls the local `isOwner` — update it to call the imported version.
  Files: `packages/backend/src/utils/ownership.ts` (create), `packages/backend/src/routes/trips.ts`, `packages/backend/src/routes/stops.ts`, `packages/backend/src/routes/sharing.ts`, `packages/backend/src/routes/route.ts`
  Verify: `cd packages/backend && npm test` — all 16 tests pass.

- [ ] 5. **Delete unused backend navigationUrl.ts** — The file `packages/backend/src/utils/navigationUrl.ts` is confirmed not imported by any route or service. Delete it. The frontend copy at `packages/frontend/src/utils/navigationUrl.ts` is retained.
  Files: `packages/backend/src/utils/navigationUrl.ts` (delete)
  Verify: `npm run build` (root) — builds clean (no import references to this file).

- [ ] 6. **Prisma: add indexes and convert travelMode/routeMode to enums** — In `packages/backend/prisma/schema.prisma`:
  - Add before model definitions:
    ```prisma
    enum TravelMode { driving walking cycling }
    enum RouteMode  { manual   optimized     }
    ```
  - Change Trip model fields: `travelMode TravelMode @default(driving)` and `routeMode RouteMode @default(manual)`.
  - Add to Stop model: `@@index([tripId])` and `@@index([sequence])`.
  - Add to Trip model: `@@index([sessionId])` and `@@index([ownerId])`.
  - (`shareToken` already has `@unique` which creates an index — do not add a redundant `@@index`.)
  Then run: `cd packages/backend && npx prisma migrate dev --name add_indexes_and_enums`
  This creates a new migration file in `prisma/migrations/`. The existing data has `'driving'` and `'manual'` strings — PostgreSQL enum migration will succeed because Prisma maps enum values to the same string labels by default.
  Files: `packages/backend/prisma/schema.prisma`, new migration file created automatically
  Verify: `cd packages/backend && npx prisma migrate status` — all migrations applied, none pending. `cd packages/backend && npm test` — 16 tests pass.

- [ ] 7. **Backend build script and start script** — In `packages/backend/package.json`, change `"build": "tsc"` to `"build": "prisma generate && tsc"`. Add `"start": "node dist/index.js"` to the scripts object.
  Files: `packages/backend/package.json`
  Verify: `cd packages/backend && npm run build` — Prisma client generates then TypeScript compiles. `ls dist/index.js` — file exists.

- [ ] 8. **Fix route geometry stitching for large routes** — In `packages/backend/src/services/RoutingService.ts`, rewrite the merge section of `calculateLargeRoute`. Replace the current `const mergedGeometry = segments[0]?.geometry ?? { ... }` block with:
  ```ts
  const allCoords: number[][] = [];
  for (let s = 0; s < segments.length; s++) {
    const geo = segments[s].geometry as { type: string; coordinates: number[][] };
    const coords = geo.coordinates ?? [];
    // Skip first coord of each subsequent segment — it duplicates the last of the previous
    const startIdx = s === 0 ? 0 : 1;
    allCoords.push(...coords.slice(startIdx));
  }
  const mergedGeometry = { type: 'LineString', coordinates: allCoords };
  ```
  Files: `packages/backend/src/services/RoutingService.ts`
  Verify: `cd packages/backend && npm test` — all 16 tests pass (the geometry merge is not directly unit-tested, but the build must succeed).

- [ ] 9. **Fix useStops duplicate fetch** — In `packages/frontend/src/hooks/useStops.ts`, remove the `useEffect` that fetches `/api/trips/${tripId}` and the `revision`/`refetch` state entirely. Change the hook signature to `useStops(tripId: string | undefined, initialStops: Stop[], onMutate: () => void)`. The `stops` state is initialized with `initialStops` and updated after each mutation by calling `onMutate()`. The mutation methods (`addStop`, `updateStop`, `deleteStop`, `reorderStops`, `markVisited`, `skipStop`) continue to call the API, then call `onMutate()` instead of `refetch()`.
  In `packages/frontend/src/pages/TripPlanner.tsx`: remove `useStops(tripId)` standalone call. Replace with `const { addStop, updateStop, deleteStop, reorderStops, markVisited, skipStop } = useStops(tripId, trip?.stops ?? [], refetchTrip)`. Use `trip?.stops ?? []` directly as the `stops` variable wherever the page rendered stop data.
  Files: `packages/frontend/src/hooks/useStops.ts`, `packages/frontend/src/pages/TripPlanner.tsx`
  Verify: `cd packages/frontend && npm test` — 17 tests pass. Open browser DevTools Network tab: only one GET /api/trips/:id on mount.

- [ ] 10. **Load cached route on mount** — In `packages/frontend/src/hooks/useRoute.ts`, change signature to `useRoute(tripId?: string, initialRouteCache?: RouteCache | null)` and initialize state: `useState<RouteCache | null>(initialRouteCache ?? null)`. In `packages/frontend/src/pages/TripPlanner.tsx`, pass `trip?.routeCache` as second arg: `useRoute(tripId, trip?.routeCache)`.
  Files: `packages/frontend/src/hooks/useRoute.ts`, `packages/frontend/src/pages/TripPlanner.tsx`
  Verify: `cd packages/frontend && npm test` — 17 tests pass.

- [ ] 11. **Export SESSION_ID_KEY and fix useGeocoding** — In `packages/frontend/src/utils/api.ts`, change `const SESSION_ID_KEY` to `export const SESSION_ID_KEY`. In `packages/frontend/src/hooks/useGeocoding.ts`, add `import { SESSION_ID_KEY } from '../utils/api'` and replace `localStorage.getItem('routesy-session-id')` with `localStorage.getItem(SESSION_ID_KEY)`. Also add AbortController unmount cleanup: add `useEffect(() => { return () => { abortControllerRef.current?.abort(); if (debounceRef.current) clearTimeout(debounceRef.current); }; }, []);`.
  Files: `packages/frontend/src/utils/api.ts`, `packages/frontend/src/hooks/useGeocoding.ts`
  Verify: `cd packages/frontend && npm test` — 17 tests pass. `npm run lint` — 0 errors.

- [ ] 12. **Delete unused useShare.ts** — Confirmed: no file in the codebase imports `useShare`. Delete `packages/frontend/src/hooks/useShare.ts`.
  Files: `packages/frontend/src/hooks/useShare.ts` (delete)
  Verify: `npm run build` (root) — builds clean.

- [ ] 13. **Fix Settings.tsx logout + console.log in index.ts** — In `packages/frontend/src/pages/Settings.tsx`, add `import { useNavigate } from 'react-router-dom'` and `const navigate = useNavigate()` in the component, then replace `window.location.reload()` with `navigate('/')`. In `packages/backend/src/index.ts`, change `console.log(...)` to `console.info(...)`.
  Files: `packages/frontend/src/pages/Settings.tsx`, `packages/backend/src/index.ts`
  Verify: `npm run lint` — 0 warnings/errors.

- [ ] 14. **GeocodingService User-Agent** — In `packages/backend/src/services/GeocodingService.ts`, change `'Routesy/1.0 (contact@routesy.app)'` to `'Routesy/1.0 (https://routesy.app)'`.
  Files: `packages/backend/src/services/GeocodingService.ts`
  Verify: `cd packages/backend && npm test` — 16 tests pass.

- [ ] 15. **Add GET /health endpoint** — In `packages/backend/src/app.ts`, add before the `app.use(errorHandler)` line:
  ```ts
  app.get('/health', (_req, res) => { res.status(200).json({ status: 'ok' }); });
  ```
  Files: `packages/backend/src/app.ts`
  Verify: `cd packages/backend && npm test` — 16 tests pass.

- [ ] 16. **Add GET /api/geocode/reverse endpoint** — In `packages/backend/src/services/GeocodingService.ts`, add a `reverse(lat: number, lng: number): Promise<GeocodingResult | null>` method that calls `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json` with the same User-Agent header and 1-second rate limit. Returns `null` if Nominatim returns an error. In `packages/backend/src/routes/geocoding.ts`, add:
  ```ts
  router.get('/reverse', geocodeLimiter, async (req, res, next) => {
    const lat = parseFloat(req.query['lat'] as string);
    const lng = parseFloat(req.query['lng'] as string);
    if (isNaN(lat) || isNaN(lng)) { sendError(res, 'lat and lng query params required', 400); return; }
    const result = await geocodingService.reverse(lat, lng);
    sendSuccess(res, result);
  });
  ```
  Files: `packages/backend/src/services/GeocodingService.ts`, `packages/backend/src/routes/geocoding.ts`
  Verify: `cd packages/backend && npm test` — 16 tests pass. `curl 'http://localhost:3001/api/geocode/reverse?lat=22.57&lng=88.36'` — returns displayName.

- [ ] 17. **Production configuration** — Create `packages/backend/src/config/env.ts` with typed env accessors (no new packages, plain manual checks). Create `packages/backend/Procfile` containing `web: npm run start`. Update root `.env.example` with all variables: DATABASE_URL, JWT_SECRET, PORT, NODE_ENV, FRONTEND_URL, VITE_API_URL, and add a comment for each. Add a `# ⚠️ Change these credentials for production deployments` comment to `docker-compose.yml` above the POSTGRES_USER line.
  Files: `packages/backend/src/config/env.ts` (create), `packages/backend/Procfile` (create), `.env.example`, `docker-compose.yml`
  Verify: `npm run build` (root) — builds clean.

- [ ] 18. **README production section** — Add a "Production Deployment" section to `README.md` covering: environment variable table (all vars from .env.example), Neon PostgreSQL setup, `npx prisma migrate deploy` (not migrate dev) for production, Render/Vercel deploy notes, health endpoint, docker-compose dev credential warning.
  Files: `README.md`
  Verify: `npm run build` (root) — builds clean (no TypeScript in README but verifies no regressions).

---

## FEAT-002 — HTTP 500 Fix and Complete Multi-Stop Workflow

- [ ] 19. **Diagnose HTTP 500 on trip creation** — Start the backend (`cd packages/backend && npm run dev`). Run: `curl -s -X POST http://localhost:3001/api/trips -H 'Content-Type: application/json' -H 'X-Session-Id: test-session-fix' -d '{"name":"Test Trip","travelMode":"driving"}' | jq .`. Inspect the response. If it still returns 500, read the backend terminal for the exception message and fix the root cause. The most likely remaining cause after FEAT-001 is a Prisma client type mismatch after the enum migration — if the generated client doesn't match the schema, run `cd packages/backend && npx prisma generate` then restart.
  Files: whichever file the logs implicate
  Verify: curl returns `{ "success": true, "data": { "id": "..." } }` with HTTP 201.

- [ ] 20. **TripPlanner: Start/End location editing** — In `packages/frontend/src/pages/TripPlanner.tsx`, add a "Route Settings" collapsible section in the sidebar below the trip name section. Show two `SearchCombobox` instances (replaced by `LocationInput` in FEAT-003): "Start location" and "End location". Pre-populate with `activeTrip?.startLocationName` and `activeTrip?.endLocationName` as displayed text. On selection, call `updateTrip({ startLocationName: result.displayName, startLatitude: result.lat, startLongitude: result.lon })` or the end equivalents. Use a state flag `routeSettingsOpen` (default: false if both start and end are already set, true if either is missing) to toggle visibility. Use ChevronDown/ChevronUp icons.
  Files: `packages/frontend/src/pages/TripPlanner.tsx`
  Verify: `cd packages/frontend && npm test` — 17 tests pass. `npm run build` — builds clean.

- [ ] 21. **Enhance Add Stop dialog with confirm step** — In `packages/frontend/src/pages/TripPlanner.tsx`, change `handleAddStopSelect` to populate a `pendingStop` state `{ name: string; address: string; lat: number; lng: number } | null` rather than immediately saving. Add a form inside the Add Stop Dialog below the SearchCombobox: an editable name field (Input component, pre-filled from `result.displayName.split(',')[0].trim()`), a read-only address line, and an "Add Stop" button (disabled until `pendingStop` is set). On "Add Stop" click: call `addStop({ name: pendingStop.name, address: pendingStop.address, latitude: pendingStop.lat, longitude: pendingStop.lng, sequence: (trip?.stops?.length ?? 0) + 1, skipped: false })`. Then call `clearRoute()` and close the dialog.
  Files: `packages/frontend/src/pages/TripPlanner.tsx`
  Verify: `cd packages/frontend && npm test` — 17 tests pass.

- [ ] 22. **Wire Edit Stop in TripPlanner** — In `packages/frontend/src/pages/TripPlanner.tsx`, add state `editingStop: Stop | null` and an Edit Stop Dialog (separate from Add Stop). The Dialog is pre-filled with the stop's current name, address, lat, lng. On save: call `updateStop(editingStop.id, { name, address, latitude, longitude })` then `clearRoute()`. Pass `onEdit={(stopId) => setEditingStop(stops.find(s => s.id === stopId) ?? null)}` to both `<StopList>` instances (desktop and mobile). Confirm `StopCard.tsx` already has an Edit button — if the button exists but has no `onClick`, wire it: `onEdit ? () => onEdit(stop.id) : undefined`.
  Files: `packages/frontend/src/pages/TripPlanner.tsx`, `packages/frontend/src/components/trip/StopCard.tsx` (check and wire if needed)
  Verify: `cd packages/frontend && npm test` — 17 tests pass.

- [ ] 23. **Add Move Up/Move Down to StopList** — In `packages/frontend/src/components/trip/StopList.tsx`, add Move Up and Move Down buttons inside each `<li>`. Import `ChevronUp, ChevronDown` from lucide-react. Each button: `size="sm"` styled (w-7 h-7, rounded), `aria-label={`Move ${stop.name} ${direction}`}`, `disabled` on first/last respectively. On click: reorder the array (swap adjacent items), reassign sequences (1-indexed), call `onReorder(reordered)`. Add `aria-roledescription="Reorderable stop item"` to the `<li>` and `role="button" aria-label="Drag to reorder"` to the draggable `<div>`.
  Files: `packages/frontend/src/components/trip/StopList.tsx`
  Verify: `cd packages/frontend && npm test` — 17 tests pass.

- [ ] 24. **Clear route on mutations** — In `packages/frontend/src/hooks/useRoute.ts`, add a `clearRoute(): void` method that sets `setRouteCache(null)`. In `packages/frontend/src/pages/TripPlanner.tsx`, after FEAT-001's useStops refactor, pass a combined `onMutate` callback to useStops that calls both `refetchTrip()` and `clearRoute()`. Wire this consistently for add, edit, delete, and reorder operations.
  Files: `packages/frontend/src/hooks/useRoute.ts`, `packages/frontend/src/pages/TripPlanner.tsx`
  Verify: `cd packages/frontend && npm test` — 17 tests pass. `npm run build` — builds clean.

---

## FEAT-003 — Map Location Picker

- [ ] 25. **MapPickerModal component** — Create `packages/frontend/src/components/map/MapPickerModal.tsx`. Props: `{ open: boolean; initialLat?: number; initialLng?: number; onConfirm: (lat: number, lng: number, displayName: string) => void; onCancel: () => void; title?: string }`. Implementation notes:
  - Full-screen fixed overlay with `z-[600]` (above mobile panel's z-[400]).
  - `MapContainer` from react-leaflet, center defaults to Kolkata (22.5726, 88.3639) if no initial coords.
  - A child component `MapCenterListener` uses `useMapEvents({ moveend: (e) => onCenterChange(e.target.getCenter().lat, e.target.getCenter().lng) })` to track center changes.
  - Crosshair pin: a `MapPin` Lucide icon (w-8 h-8, indigo-600) in a `div` with `position: absolute; top: 50%; left: 50%; transform: translate(-50%, -100%); pointer-events: none; z-index: 500` inside the relative map wrapper.
  - On center change: debounce 400ms, then call `GET /api/geocode/reverse?lat=&lng=` using `fetch` with the session-id header, update displayed address.
  - Footer: "Cancel" (secondary Button) and "Confirm Location" (primary Button). On confirm: call `onConfirm(currentLat, currentLng, resolvedAddress ?? `${currentLat.toFixed(5)}, ${currentLng.toFixed(5)}`)`.
  - When `open` is false, render nothing (return null).
  Files: `packages/frontend/src/components/map/MapPickerModal.tsx` (create)
  Verify: `cd packages/frontend && npm test` — 17 tests pass (no direct test for this component, but build must pass). `npm run build` — builds clean.

- [ ] 26. **LocationInput composite component** — Create `packages/frontend/src/components/ui/LocationInput.tsx`. Props: `{ id: string; label: string; placeholder?: string; value?: { name: string; lat: number; lng: number } | null; onChange: (loc: { name: string; lat: number; lng: number } | null) => void; required?: boolean; className?: string }`. Implementation: renders `SearchCombobox` (full width) with a `MapPin` icon button ("Map" text, sm secondary) to its right. The two are in a flex row (`flex gap-2 items-end`). The SearchCombobox uses `useGeocoding` internally (the hook is already in scope — pass onSearch and onSelect). On geocode result selected: call `onChange({ name: result.displayName, lat: result.lat, lng: result.lon })`. On "Map" button click: set `mapPickerOpen = true`, open `MapPickerModal` with `initialLat={value?.lat}` `initialLng={value?.lng}`. On MapPickerModal confirm: call `onChange({ name: displayName, lat, lng })` and close modal.
  Files: `packages/frontend/src/components/ui/LocationInput.tsx` (create)
  Verify: `npm run build` — builds clean. `npm run lint` — 0 errors.

- [ ] 27. **Integrate LocationInput into NewTrip.tsx** — Replace the two `SearchCombobox` instances (start-location and end-location) with `LocationInput`. The `startLocation` and `endLocation` state shape `{ name: string; lat: number | null; lng: number | null }` is compatible — update onChange to match `LocationInput`'s `{ name, lat, lng }` signature (where lat/lng are always numbers from LocationInput). Adjust the `handleStartSelect`/`handleEndSelect` to call `setStartLocation({ name: loc.name, lat: loc.lat, lng: loc.lng })`. Remove the `useGeocoding` hook call from NewTrip.tsx since LocationInput handles geocoding internally.
  Files: `packages/frontend/src/pages/NewTrip.tsx`
  Verify: `cd packages/frontend && npm test` — 17 tests pass. `npm run build` — builds clean.

- [ ] 28. **Integrate LocationInput into TripPlanner** — In `packages/frontend/src/pages/TripPlanner.tsx`:
  - Replace the SearchCombobox in the "Route Settings" start/end section (from item 20) with `LocationInput`.
  - Replace the SearchCombobox in the Add Stop Dialog with `LocationInput`.
  - Replace the SearchCombobox in the Edit Stop Dialog with `LocationInput`.
  - Remove the standalone `useGeocoding` hook from TripPlanner.tsx since LocationInput handles it internally (unless it's still needed for something else — check before removing).
  Files: `packages/frontend/src/pages/TripPlanner.tsx`
  Verify: `cd packages/frontend && npm test` — 17 tests pass. `npm run build` — builds clean.

---

## FEAT-004 — Auth Pages, Explore Page, and Guest Migration

- [ ] 29. **Login.tsx page** — Create `packages/frontend/src/pages/Login.tsx`. Full working login form using the existing `Input` and `Button` components. On submit: `api.post('/api/auth/login', { email, password })`. On success: `localStorage.setItem('routesy-token', data.token)` and `localStorage.setItem('routesy-user-email', data.user.email)`, then `navigate('/trips')`. Error display via a `<p role="alert">` element. Include a `<Link to="/register">` for new users.
  Files: `packages/frontend/src/pages/Login.tsx` (create)
  Verify: `cd packages/frontend && npm test` — 17 tests pass. `npm run build` — builds clean.

- [ ] 30. **Register.tsx page** — Create `packages/frontend/src/pages/Register.tsx`. Fields: email, password, confirm password. Client validation: password ≥8 chars, passwords match. On submit: `api.post('/api/auth/register', { email, password })`. On success: store token+email to localStorage, `navigate('/trips')`. Include `<Link to="/login">`.
  Files: `packages/frontend/src/pages/Register.tsx` (create)
  Verify: `cd packages/frontend && npm test` — 17 tests pass.

- [ ] 31. **Explore.tsx page (stub)** — Create `packages/frontend/src/pages/Explore.tsx`. Centered layout, `Map` icon (Lucide), heading "Explore", subtext "Discover public trips and popular routes — coming soon.", a `Button` that navigates to `/trips`.
  Files: `packages/frontend/src/pages/Explore.tsx` (create)
  Verify: `npm run build` — builds clean.

- [ ] 32. **Router: add Login, Register, Explore routes** — In `packages/frontend/src/router/index.tsx`, add lazy imports and route entries for Login (`path: 'login'`), Register (`path: 'register'`), and Explore (`path: 'explore'`) — all as children of the Layout route with Suspense wrappers matching the existing pattern.
  Files: `packages/frontend/src/router/index.tsx`
  Verify: `cd packages/frontend && npm test` — 17 tests pass. `npm run build` — builds clean.

- [ ] 33. **Guest-to-account migration on login/register** — In `packages/backend/src/routes/auth.ts`, in both the `/login` and `/register` handlers, after successful auth and before `sendSuccess`, add:
  ```ts
  const sessionId = req.headers['x-session-id'] as string | undefined;
  if (sessionId) {
    await prisma.trip.updateMany({
      where: { sessionId, ownerId: null },
      data: { ownerId: user.id, sessionId: null },
    });
  }
  ```
  Files: `packages/backend/src/routes/auth.ts`
  Verify: `cd packages/backend && npm test` — all 16 tests pass.

- [ ] 34. **Layout.tsx: auth state in navbar** — In `packages/frontend/src/components/Layout.tsx`, add auth state reading (synchronous localStorage read, no new context needed): `const isAuthenticated = Boolean(localStorage.getItem('routesy-token'))` and `const userEmail = localStorage.getItem('routesy-user-email')`. In the right-side actions area, render:
  - When authenticated: user email (truncated to 20 chars, `text-sm text-slate-600 dark:text-slate-300`) + a "Log out" button (LogOut icon from Lucide, secondary sm). Logout clears `'routesy-token'` and `'routesy-user-email'` from localStorage and calls `navigate('/')`. Add `const navigate = useNavigate()` and `import { useNavigate } from 'react-router-dom'`.
  - When not authenticated: "Log in" link to `/login` (text style) and "Sign up" link to `/register` (indigo button style, matching existing "New Trip" button style).
  - Keep the existing "New Trip" button when authenticated.
  Files: `packages/frontend/src/components/Layout.tsx`
  Verify: `cd packages/frontend && npm test` — 17 tests pass. `npm run build` — builds clean.

---

## FEAT-005 — Integration Verification and Final Commit

- [ ] 35. **Full test suite** — Run `npm test` (root). All 33 tests must pass. Common failure modes to fix: (a) TypeScript errors from useStops signature change — ensure test fixtures use the new three-argument signature; (b) Prisma enum type mismatches in backend tests that construct Trip objects with string travelMode/routeMode — update test fixtures to use enum string values `'driving'`, `'manual'` (same strings, just now enum-backed); (c) any import errors from deleted files (useShare.ts, navigationUrl.ts backend).
  Files: whichever test files need updating
  Verify: `npm test` — exit 0, 33/33.

- [ ] 36. **Full build** — Run `npm run build` (root). Fix any remaining TypeScript errors. Known watch-outs: (a) circular imports after SESSION_ID_KEY export; (b) Prisma generated types for TravelMode/RouteMode enums — routes that assign `travelMode` may need to use the Prisma enum type instead of a raw string; (c) the `useRoute` signature change with the new optional second parameter.
  Files: whichever files the build errors implicate
  Verify: `npm run build` — exit 0.

- [ ] 37. **Full lint** — Run `npm run lint` (root). Fix any ESLint errors or warnings (frontend is `--max-warnings 0`). Common issues: unused imports after refactoring, missing dependency arrays in useEffect hooks.
  Files: whichever files lint reports
  Verify: `npm run lint` — exit 0.

- [ ] 38. **Frontend type-check** — Run `cd packages/frontend && npx tsc --noEmit`. Fix any type errors not caught during build.
  Files: whichever files tsc reports
  Verify: `cd packages/frontend && npx tsc --noEmit` — exit 0, no errors.

- [ ] 39. **Write completion report** — Write `/Users/shrezzzzz/Documents/Code/Routesy/.agents/tasks/preproduction-report.md` with: all changes by phase, migration names applied, test/build/lint results, any deferred items or known limitations.
  Files: `.agents/tasks/preproduction-report.md` (create)
  Verify: file exists and is readable.

- [ ] 40. **Git commit** — Stage all changed files by package (do not stage `.env`, `node_modules`, or secrets): `git add packages/ .env.example README.md docker-compose.yml`. Verify staged files look correct: `git diff --staged --name-only`. Commit: `git commit -m "feat: pre-production fixes, map picker, auth pages, sharing improvements"`. Push to the current branch: `git push origin $(git branch --show-current)`.
  Files: all modified files
  Verify: `git log --oneline -1` — shows the commit.

---

## Key Constraints (repeated for coder reference)

- PostgreSQL: local Homebrew, port 5432, db `routesy`, user/password `routesy`.
- `DATABASE_URL=postgresql://routesy:routesy@localhost:5432/routesy` in `packages/backend/.env`.
- Prisma migrations: `npx prisma migrate dev --name <name>`. NEVER `prisma migrate reset` or `prisma db push --force-reset`.
- Do not delete any file in `packages/backend/prisma/migrations/`.
- No new npm packages outside the existing stack.
- Tailwind for all styling. Lucide icons only.
- All items must leave the codebase buildable and with all 33 tests passing.
