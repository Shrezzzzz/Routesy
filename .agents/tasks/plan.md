# Implementation Plan — Routeora Full-Stack

This plan is the canonical ordered checklist for building Routeora. The work is decomposed into four sequential FEATs, each implemented by a dedicated coder step. Full artifact details are in `.agents/tasks/task-routeora-full-stack/`.

---

## Key architectural decisions

**Prisma generate only (no migrate):** No live PostgreSQL database is available during implementation. All steps run `npx prisma generate` to produce the TypeScript client. A human developer runs `prisma migrate dev` after starting Docker Compose.

**nanoid v3 (CommonJS):** nanoid v4+ is ESM-only and incompatible with the CommonJS backend (`"module": "commonjs"` in tsconfig). Use nanoid@3.3.7 which supports `require()`.

**HTML5 drag-and-drop for stop reordering:** No external DnD library. The `StopList` component uses the browser's native `draggable` API. Route recalculation is triggered on `dragend` (drop), not on every drag step.

**Guest mode via X-Session-Id header:** Trips without authentication are owned by a random UUID stored in `localStorage` under the key `routeora-session-id`. The backend reads this from the `X-Session-Id` request header.

**Share token privacy:** The `GET /api/share/:token` endpoint uses `ShareService.buildPublicTripPayload()` to strip `ownerId`, `owner` (including `email` and `password`), and `sessionId` before returning data to unauthenticated callers.

**Leaflet icon fix:** React Leaflet on Vite requires manually resetting `L.Icon.Default.prototype._getIconUrl` to `undefined` and calling `L.Icon.Default.mergeOptions({iconUrl, iconRetinaUrl, shadowUrl})` with Leaflet's bundled PNGs. Do this in `MapContainer.tsx`.

**Vite dev proxy:** `vite.config.ts` proxies `/api` to `http://localhost:3001` so frontend dev server calls reach the backend without CORS headers during development.

---

## FEAT-001 — Backend Package (implement first; establishes API contract)

- [ ] 1. Create `packages/backend/package.json` with all production and dev dependencies at exact pinned versions.
      Files: `packages/backend/package.json`
      Verify: `cd packages/backend && npm install` exits 0.

- [ ] 2. Create `packages/backend/tsconfig.json` (target ES2020, module commonjs, outDir ./dist, strict true).
      Files: `packages/backend/tsconfig.json`
      Verify: file exists and is valid JSON.

- [ ] 3. Create `packages/backend/prisma/schema.prisma` with User, Trip, Stop, RouteCache models as specified.
      Files: `packages/backend/prisma/schema.prisma`
      Verify: `cd packages/backend && npx prisma generate` exits 0, Prisma client generated under `node_modules/.prisma/client`.

- [ ] 4. Create `packages/backend/src/lib/prisma.ts` — PrismaClient singleton export.
      Files: `packages/backend/src/lib/prisma.ts`
      Verify: referenced by all routes; mocked in tests via `vi.mock('../lib/prisma')`.

- [ ] 5. Create `packages/backend/src/utils/responseHelpers.ts` and `src/utils/navigationUrl.ts`.
      Files: `packages/backend/src/utils/responseHelpers.ts`, `packages/backend/src/utils/navigationUrl.ts`
      Verify: `npm run build` at end of step group passes.

- [ ] 6. Create all middleware: `src/middleware/errorHandler.ts`, `src/middleware/auth.ts`, `src/middleware/rateLimiter.ts`.
      Files: `packages/backend/src/middleware/errorHandler.ts`, `auth.ts`, `rateLimiter.ts`
      Verify: `npm run build` passes.

- [ ] 7. Create all services: `src/services/GeocodingService.ts`, `RoutingService.ts`, `ShareService.ts`.
      Files: `packages/backend/src/services/GeocodingService.ts`, `RoutingService.ts`, `ShareService.ts`
      Verify: `npm run build` passes.

- [ ] 8. Create all Zod validators: `src/validators/tripValidators.ts`, `stopValidators.ts`, `authValidators.ts`.
      Files: `packages/backend/src/validators/`
      Verify: `npm run build` passes.

- [ ] 9. Create all route handlers: `src/routes/auth.ts`, `trips.ts`, `stops.ts`, `route.ts`, `sharing.ts`, `geocoding.ts`.
      Files: `packages/backend/src/routes/`
      Verify: `npm run build` passes.

- [ ] 10. Create `src/app.ts` (Express factory) and `src/index.ts` (listener).
       Files: `packages/backend/src/app.ts`, `packages/backend/src/index.ts`
       Verify: `cd packages/backend && npm run build` exits 0, `dist/index.js` exists.

- [ ] 11. Create `prisma/seed.ts` with 21 Kolkata pandal stops.
       Files: `packages/backend/prisma/seed.ts`
       Verify: `cd packages/backend && npm run build` still passes (seed is TypeScript-compiled).

- [ ] 12. Create `vitest.config.ts`, `src/tests/trips.test.ts`, `src/tests/utils.test.ts`.
       Files: `packages/backend/vitest.config.ts`, `src/tests/`
       Verify: `cd packages/backend && npm test` passes all tests.

---

## FEAT-002 — Frontend Package: Scaffold + Design System (depends on FEAT-001 for API contract only)

- [ ] 13. Create `packages/frontend/package.json`, `tsconfig.json`, `vite.config.ts`, `tailwind.config.js`, `postcss.config.js`.
       Files: `packages/frontend/package.json` and config files
       Verify: `cd packages/frontend && npm install` exits 0.

- [ ] 14. Create `index.html`, `src/main.tsx`, `src/App.tsx`, `src/index.css`.
       Files: `packages/frontend/index.html`, `src/main.tsx`, `src/App.tsx`, `src/index.css`
       Verify: `cd packages/frontend && npm run build` exits 0.

- [ ] 15. Create `src/types/index.ts` and `src/utils/cn.ts`, `api.ts`, `navigationUrl.ts`.
       Files: `packages/frontend/src/types/index.ts`, `src/utils/`
       Verify: `npm run build` passes.

- [ ] 16. Create `src/router/index.tsx` with all 7 routes.
       Files: `packages/frontend/src/router/index.tsx`
       Verify: `npm run build` passes.

- [ ] 17. Create all UI components: Button, Input, Badge, Card, Dialog, LoadingSkeleton, ErrorMessage, BottomSheet, ProgressBar, SearchCombobox.
       Files: `packages/frontend/src/components/ui/`
       Verify: `npm run build` passes.

- [ ] 18. Create all map components: MapContainer, NumberedMarker, RoutePolyline.
       Files: `packages/frontend/src/components/map/`
       Verify: `npm run build` passes.

- [ ] 19. Create all trip components: TripCard, StopCard, StopList, RouteStats, ShareModal.
       Files: `packages/frontend/src/components/trip/`
       Verify: `npm run build` passes.

- [ ] 20. Create `src/components/Layout.tsx`.
       Files: `packages/frontend/src/components/Layout.tsx`
       Verify: `npm run build` passes.

- [ ] 21. Create `vitest.config.ts`, `src/vitest.setup.ts`, `src/tests/components.test.tsx`.
       Files: `packages/frontend/vitest.config.ts`, `src/vitest.setup.ts`, `src/tests/components.test.tsx`
       Verify: `cd packages/frontend && npm test` passes.

---

## FEAT-003 — Frontend Pages & Hooks (depends on FEAT-002)

- [ ] 22. Create `src/context/ThemeContext.tsx` with ThemeProvider and useTheme hook.
       Files: `packages/frontend/src/context/ThemeContext.tsx`
       Verify: `npm run build` passes.

- [ ] 23. Create all custom hooks: useTrip, useStops, useRoute, useGeocoding, useProgress, useShare.
       Files: `packages/frontend/src/hooks/`
       Verify: `npm run build` passes.

- [ ] 24. Create all pages: Landing, Trips, NewTrip, TripPlanner, TripNavigate, ShareView, Settings.
       Files: `packages/frontend/src/pages/`
       Verify: `cd packages/frontend && npm run build` exits 0 — all pages compile with no TS errors.

- [ ] 25. Wire ThemeProvider into App.tsx; confirm router covers all routes.
       Files: `packages/frontend/src/App.tsx`, `src/router/index.tsx`
       Verify: `npm run build` passes.

---

## FEAT-004 — Infrastructure, Lint, and Final Integration (depends on FEAT-001–003)

- [ ] 26. Create `docker-compose.yml` at workspace root.
       Files: `/Users/shrezzzzz/Documents/Code/Routesy/docker-compose.yml`
       Verify: file exists with postgres:16-alpine service.

- [ ] 27. Create ESLint and Prettier configs for both packages. Install lint dev deps.
       Files: `packages/backend/.eslintrc.json`, `.prettierrc`; `packages/frontend/.eslintrc.json`, `.prettierrc`
       Verify: `npm run lint` from root exits with no unresolved errors.

- [ ] 28. Run full root build and test. Fix any seam issues.
       Verify: `npm run build` and `npm test` from workspace root both exit 0.

- [ ] 29. Write `README.md` at workspace root.
       Files: `/Users/shrezzzzz/Documents/Code/Routesy/README.md`
       Verify: file exists.

- [ ] 30. Commit all work on the current branch.
       Verify: `git log --oneline -1` shows the commit message.

---

## Integration gotchas

1. **Prisma import path:** All backend routes must import `prisma` from `../lib/prisma` (not direct `new PrismaClient()`). Tests mock this path.

2. **nanoid in CommonJS:** `const { nanoid } = require('nanoid')` works with v3. ES module `import { nanoid } from 'nanoid'` does NOT work with commonjs module target.

3. **Leaflet CSS:** Must be imported in `src/index.css` before Tailwind directives, or markers will be invisible.

4. **Leaflet default icon 404:** The Vite bundler breaks Leaflet's internal `_getIconUrl`. Fix in `MapContainer.tsx` before rendering any markers.

5. **React Router v6 layout:** The Layout component uses `<Outlet />`. ShareView must be outside the Layout route group to render without the nav bar.

6. **OSRM coordinate order:** OSRM expects `{longitude},{latitude}` (not lat,lng). Swap when building coordinate strings.

7. **Route recalculation:** Only call the route API after the user drops a stop (dragend), not on every drag event. The RoutingService respects a 1-req/sec rate limit.

8. **Share endpoint security test:** The vitest test `GET /api/share/:token` must assert that `response.body.data.owner` is undefined or null — never contains `email` or `password`.

9. **Environment variables:** Backend reads `DATABASE_URL`, `JWT_SECRET`, `PORT`, `FRONTEND_URL` from `process.env`. Frontend reads `VITE_API_URL` from `import.meta.env`. The `.env` file is gitignored; `.env.example` is the template.

10. **Mobile touch targets:** All interactive elements in `TripNavigate.tsx` and `StopCard.tsx` must have `min-h-[44px]` and `min-w-[44px]` per spec.
