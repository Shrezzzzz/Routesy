# Routeora

**Plan your stops. Enjoy the journey.**

Routeora is a multi-stop route planner and trip execution app. Plan an itinerary with many destinations, view all stops on an interactive map, share the route with friends, and navigate one stop at a time — without ever losing your place.

Built initially for planning Durga Puja pandal visits across Kolkata, it is generic enough for road trips, food tours, sightseeing, college trips, and any multi-stop journey.

---

## Tech stack

| Layer | Technology |
|---|---|
| Frontend | React 18, TypeScript, Vite, Tailwind CSS, React Router v6, Leaflet / React Leaflet, Lucide React |
| Backend | Node.js, Express, TypeScript |
| Database | PostgreSQL 16, Prisma ORM |
| Validation | Zod |
| Tests | Vitest, React Testing Library, Supertest |

---

## Setup

### 1. Clone and install

```bash
git clone <repo-url>
cd routeora
npm install
```

### 2. Configure environment variables

```bash
cp .env.example .env
```

Edit `.env` and set values for:

- `DATABASE_URL` — PostgreSQL connection string (default works with Docker Compose below)
- `JWT_SECRET` — secret for signing JWTs
- `PORT` — backend port (default: `3001`)
- `FRONTEND_URL` — frontend origin for CORS (default: `http://localhost:5173`)
- `VITE_API_URL` — backend URL for the frontend (default: `http://localhost:3001`)

### 3. Start PostgreSQL with Docker Compose

```bash
docker compose up -d
```

This starts a `postgres:16-alpine` container on port `5432` using the credentials in `docker-compose.yml`.

### 4. Run database migrations

```bash
cd packages/backend
npx prisma migrate dev
```

Optionally seed 21 Kolkata Durga Puja pandal stops:

```bash
npm run prisma:seed
```

### 5. Start the development servers

```bash
# from workspace root
npm run dev
```

This runs the backend (port 3001) and frontend (port 5173) concurrently via `concurrently`.

---

## Available scripts

Run from the workspace root:

| Script | Description |
|---|---|
| `npm run dev` | Start both backend and frontend dev servers |
| `npm run build` | Compile TypeScript (backend) and Vite bundle (frontend) |
| `npm test` | Run all Vitest test suites |
| `npm run lint` | Run ESLint across both packages |

Run from `packages/backend`:

| Script | Description |
|---|---|
| `npm run build` | Compile TypeScript to `dist/` |
| `npm run dev` | Start backend with hot-reload via `tsx watch` |
| `npm test` | Run backend API tests |
| `npm run prisma:generate` | Generate Prisma client without a live DB |
| `npm run prisma:seed` | Seed sample pandal data |

Run from `packages/frontend`:

| Script | Description |
|---|---|
| `npm run build` | Vite production build to `dist/` |
| `npm run dev` | Start Vite dev server |
| `npm test` | Run frontend component tests |
| `npm run preview` | Serve the production build locally |

---

## API

Base URL: `http://localhost:3001` (set via `PORT` env var)

Key endpoints:

- `GET /api/trips` — list trips (requires `X-Session-Id` header or Bearer token)
- `POST /api/trips` — create a trip
- `GET /api/trips/:id` — get a trip with stops and route cache
- `PUT /api/trips/:id` — update trip fields
- `DELETE /api/trips/:id` — delete a trip
- `POST /api/trips/:id/duplicate` — duplicate a trip
- `POST /api/trips/:id/stops` — add a stop
- `PUT /api/trips/:id/stops/:stopId` — update a stop
- `DELETE /api/trips/:id/stops/:stopId` — remove a stop
- `POST /api/trips/:id/stops/reorder` — reorder stops
- `POST /api/trips/:id/route` — calculate route via OSRM
- `POST /api/trips/:id/share` — enable public sharing
- `DELETE /api/trips/:id/share` — disable public sharing
- `GET /api/share/:token` — get public read-only trip (no auth required)
- `GET /api/geocoding/search?q=…` — geocode a location via Nominatim

## Shared itinerary URL pattern

Public itineraries are accessible at:

```
/share/:shareToken
```

Share tokens are 21-character URL-safe strings generated with nanoid. The public endpoint never exposes the owner's email address or password.
