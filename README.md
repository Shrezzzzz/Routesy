# Routesy

**Plan your stops. Enjoy the journey.**

Routesy is a multi-stop route planner and trip execution app. Add many destinations to a single itinerary, view every stop on an interactive map, share the route with friends, and navigate one stop at a time — without losing your place.

Built for planning Durga Puja pandal visits across Kolkata, but generic enough for road trips, food tours, sightseeing, and any multi-stop journey.

---

## Tech stack

| Layer | Technology |
|---|---|
| Frontend | React 18, TypeScript, Vite, Tailwind CSS, React Router v6, Leaflet, Lucide React |
| Backend | Node.js 20, Express 4, TypeScript |
| Database | PostgreSQL (Neon in production, local PG in development) |
| ORM | Prisma 5 |
| Validation | Zod |
| Tests | Vitest, React Testing Library |
| Map tiles | OpenStreetMap via Leaflet (free, attribution required) |
| Geocoding | Nominatim (free, 1 req/sec limit) |
| Routing | OSRM public demo (free, fair use) |
| Navigation | Google Maps direction URLs (no API key required) |

---

## Local development

### Prerequisites

- Node.js 20+
- A running PostgreSQL instance (local install, or any hosted PG)

### 1. Clone and install

```bash
git clone https://github.com/Shrezzzzz/Routesy.git
cd Routesy
npm install
```

### 2. Configure environment variables

Create `packages/backend/.env`:

```bash
cp .env.example packages/backend/.env
```

Then edit `packages/backend/.env` and set:

| Variable | Value |
|---|---|
| `DATABASE_URL` | Your local PostgreSQL connection string |
| `JWT_SECRET` | Generate: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"` |
| `NODE_ENV` | `development` |
| `FRONTEND_URL` | `http://localhost:5173` |

> The backend **will refuse to start** if `JWT_SECRET` is missing or left as a placeholder.

### 3. Run database migrations

```bash
cd packages/backend
npx prisma migrate deploy
```

Optionally seed 21 Kolkata Durga Puja pandal stops:

```bash
npm run prisma:seed
```

### 4. Start the development servers

From the workspace root:

```bash
npm run dev
```

This starts both the backend (port 3001) and frontend (port 5173) concurrently.

- Frontend: http://localhost:5173
- Backend: http://localhost:3001
- Health check: http://localhost:3001/health

---

## Available scripts

### Workspace root

| Script | Description |
|---|---|
| `npm run dev` | Start both backend and frontend dev servers |
| `npm run build` | Build both packages |
| `npm test` | Run all tests |
| `npm run lint` | Lint both packages |

### `packages/backend`

| Script | Description |
|---|---|
| `npm run build` | Generate Prisma client + compile TypeScript |
| `npm run dev` | Start with hot-reload (`tsx watch`) |
| `npm run start` | Start compiled production build |
| `npm run migrate` | Apply pending migrations (`prisma migrate deploy`) |
| `npm test` | Run backend tests |
| `npm run prisma:seed` | Seed demo pandal data |

### `packages/frontend`

| Script | Description |
|---|---|
| `npm run build` | Vite production build |
| `npm run dev` | Start Vite dev server |
| `npm test` | Run frontend component tests |
| `npm run preview` | Preview production build locally |

---

## Production deployment

### Architecture

| Component | Platform |
|---|---|
| Frontend | Render (Static Site) |
| Backend API | Render (Web Service) |
| Database | Neon PostgreSQL |
| Source | GitHub |

### Frontend — Render Static Site

Settings:

| Setting | Value |
|---|---|
| Root directory | `packages/frontend` |
| Build command | `npm install && npm run build` |
| Publish directory | `packages/frontend/dist` |

The file `packages/frontend/.env.production` is already committed and sets `VITE_API_URL` to the backend URL at build time. No environment variables need to be added in Render for the frontend.

### Backend — Render Web Service

Settings:

| Setting | Value |
|---|---|
| Root directory | `packages/backend` |
| Build command | `npm install && npm run build` |
| Start command | `npm run start` |

**Deploy hook (run migrations before each deploy):**
Add a pre-deploy command of `npm run migrate` in the Render service settings, or run it manually after first deploy.

**Environment variables to set in Render:**

| Variable | Value |
|---|---|
| `DATABASE_URL` | Your Neon connection string (with `?sslmode=require&channel_binding=require`) |
| `JWT_SECRET` | A strong random secret (generate locally: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`) |
| `NODE_ENV` | `production` |
| `FRONTEND_URL` | `https://routesy-plan-your-stop.onrender.com` |
| `GEOCODING_USER_AGENT` | `Routesy/1.0 (https://github.com/Shrezzzzz/Routesy)` |
| `PORT` | Set automatically by Render — do not override |

> Never paste the Neon connection string or JWT secret into a committed file.

### Database migrations

On every deploy, run:

```bash
npx prisma migrate deploy
```

This applies only pending migrations. It is safe to run against an existing database — it will not drop data or reset the schema.

To set this up as a pre-deploy hook in Render, add the following as a "Pre-Deploy Command":

```
npm run migrate
```

---

## External services

| Service | Purpose | Key required | Usage limit |
|---|---|---|---|
| OpenStreetMap / Leaflet | Map tiles | No | Attribution required |
| Nominatim | Address search, reverse geocoding | No | 1 req/sec max; must send User-Agent |
| OSRM (project-osrm.org) | Road route calculation | No | Public demo — fair use only |
| Google Maps (direction URLs) | Navigation handoff | No | Uses public `/maps/dir/` URL |

**Nominatim usage policy:** Do not send one request per keystroke. Routesy debounces searches at 300 ms and enforces a 1-second minimum interval between backend requests. If you deploy Routesy publicly at scale, consider self-hosting Nominatim or using a commercial geocoding provider.

**OSRM:** The public demo server has no guaranteed SLA. If it is unavailable, route calculation will fail gracefully — the app continues to work without the route polyline.

---

## API

Base URL in production: `https://routesy-plan-your-stop.onrender.com`

| Endpoint | Description |
|---|---|
| `GET /health` | Health check |
| `POST /api/auth/register` | Create account |
| `POST /api/auth/login` | Sign in |
| `GET /api/auth/me` | Current user |
| `GET /api/trips` | List trips (session or auth) |
| `POST /api/trips` | Create trip |
| `GET /api/trips/:id` | Get trip with stops |
| `PUT /api/trips/:id` | Update trip |
| `DELETE /api/trips/:id` | Delete trip |
| `POST /api/trips/:id/duplicate` | Duplicate trip |
| `POST /api/trips/:id/stops` | Add stop |
| `PUT /api/trips/:id/stops/:stopId` | Update stop |
| `DELETE /api/trips/:id/stops/:stopId` | Delete stop |
| `POST /api/trips/:id/stops/reorder` | Reorder stops |
| `POST /api/trips/:id/route` | Calculate route (OSRM) |
| `POST /api/trips/:id/share` | Enable sharing |
| `DELETE /api/trips/:id/share` | Disable sharing |
| `GET /api/share/:token` | Public read-only trip |
| `GET /api/geocode/search?q=` | Search locations (Nominatim) |
| `GET /api/geocode/reverse?lat=&lng=` | Reverse geocode a coordinate |

## Shared itinerary URLs

```
/share/:shareToken
```

Tokens are 21-character nanoid strings (~126 bits entropy). The public endpoint never exposes owner email, password, or session identifiers.
