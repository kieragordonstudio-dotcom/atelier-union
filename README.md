# Atelier Union

Atelier Union is a React, Vite and TypeScript salon website with the private KGD salon-management workspace at `/KGD`. One Express process serves the built frontend, same-origin APIs and PostgreSQL-backed booking system.

## Requirements

- Node.js 20.19 or newer
- pnpm 10
- PostgreSQL 14 or newer

Copy `.env.example` to `.env` and provide all required values. Never commit that file.

## Local development

```bash
pnpm install
pnpm run db:migrate
pnpm run db:seed
pnpm run dev
```

Vite serves the frontend and proxies `/api` to the Express development server on port `3001`.

## Verification

```bash
pnpm run check
pnpm run test
pnpm run build
pnpm run start
```

`db:seed` bootstraps Atelier Union from the existing repository data and creates the configured owner only when missing. It does not create clients, appointments, revenue or analytics, and repeated runs do not overwrite owner-managed salon data.

## Architecture

- `src/`: finished customer website and booking UI
- `src/kgd/`: isolated KGD owner application
- `server/routes/`: `/api/public`, `/api/auth` and authenticated `/api/admin` routes
- `server/services/`: availability, booking, conflict and administration logic
- `server/db/schema.ts`: tenant-aware Drizzle schema
- `migrations/`: PostgreSQL migrations, including database-level appointment overlap protection
- `tests/`: authentication, tenant, availability and booking integration tests

## Render deployment

`render.yaml` defines:

- Node web service: `atelier-union`
- PostgreSQL database: `atelier-union-db`
- Build: `pnpm install --frozen-lockfile && pnpm run build`
- Start: `pnpm run db:migrate && pnpm run db:seed && pnpm run start`
- Health check: `/api/health`

The Blueprint wires `DATABASE_URL` and generates `SESSION_SECRET`. Enter `KGD_ADMIN_EMAIL` and a strong `KGD_ADMIN_PASSWORD` when Render prompts for the unsynced values. The first start migrates and seeds the database; later starts preserve all owner changes.

The public routes remain unlinked from `/KGD`. Admin pages send `noindex, nofollow`, use server-side sessions, and are never wrapped in the public header or footer.
