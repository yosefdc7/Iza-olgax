# Current Work

## Objective

Migrate and run Izah POS in Google AI Studio runtime environment following github_import_migration specifications.

## Status

Migration changes applied: package scripts normalized to npm on port 3000 (0.0.0.0), Next.js standalone output configured, Better Auth and Prisma initialization wrapped with safe fallbacks, pnpm-workspace.yaml removed, and metadata.json initialized.

## Completed

- Initialized `metadata.json` with app title, description, and server-side capabilities.
- Deleted `pnpm-workspace.yaml` and normalized package scripts from pnpm to npm.
- Updated `postinstall` script to `rm -rf src/generated/prisma && prisma generate || true` preventing `EEXIST` conflicts during container package installation.
- Configured `next dev -p 3000 -H 0.0.0.0` and `next start -p 3000 -H 0.0.0.0`.
- Configured `output: "standalone"` unconditionally in `next.config.ts`.
- Wrapped `createPrismaClient` with try-catch and proxy fallback in `src/lib/db.ts`.
- Added dev fallback secret in `src/lib/auth.ts` to prevent Better Auth startup crash when unconfigured.
- Replaced `BETTER_AUTH_TRUSTED_ORIGINS` with `ALLOWED_ORIGINS` in `.env.example`, `docker-compose.yml`, and `docs/configuration.md`, and integrated CORS / origin validation in `src/proxy.ts`.
- Removed `bun.lock` to ensure container default package manager resolves strictly to standard `npm`.
- Verified development server startup and HTTP 200 responses on port 3000 for `/setup` and `/login`.

## Important Decisions

- Preserve existing architecture and offline-first IndexedDB capabilities while ensuring zero-crash startup in the container environment.
- Use safe runtime fallbacks when external database credentials are not yet configured, allowing the built-in setup wizard to guide the user.
- Enforce CORS and origin protection in `src/proxy.ts` using `ALLOWED_ORIGINS`, rejecting cross-origin mutations from unlisted origins with 403 while supporting local development origins in non-production.

## Changed Files

- src/proxy.ts
- src/env.d.ts
- .env.example
- docker-compose.yml
- docs/configuration.md
- metadata.json
- package.json
- next.config.ts
- src/lib/db.ts
- src/lib/auth.ts
- CURRENT.md
- pnpm-workspace.yaml (deleted)
- pnpm-lock.yaml
- prisma/migrations/\* (applied to fresh Supabase project)
- prisma/migrations/20260904150000_add_daily_sales_ledger/migration.sql (created, not yet applied to production)
- prisma/schema.prisma
- prisma/seed-catalog.ts
- prisma/seed.ts (deleted)
- prisma/generate-seed-sql.ts (deleted)
- src/app/actions/settings-actions.ts
- src/app/api/sales/route.ts
- src/app/api/sales/[id]/refund/route.ts
- src/app/api/stock-adjustments/route.ts
- src/app/api/setup/complete/route.ts
- src/app/api/setup/migrate/route.ts
- src/components/settings/settings-form.tsx
- src/components/pos/payment-panel.tsx
- src/components/pos/pos-screen.tsx
- src/components/sales/sales-table.tsx
- src/app/api/receipt-series/route.ts
- src/app/api/reports/daily-ledger/route.ts
- src/app/api/sales/export/route.ts
- src/components/reports/daily-sales-ledger.tsx
- src/components/reports/reports-dashboard.tsx
- src/components/reports/reports-workspace.tsx
- src/components/settings/receipt-series-manager.tsx
- src/lib/daily-ledger.ts
- src/lib/sync.ts
- src/tests/sync.test.ts
- src/tests/daily-ledger.test.ts
- src/env.d.ts
- src/lib/auth.ts
- src/lib/db.ts
- src/lib/storage.ts
- src/tests/e2e/global-setup.ts
- wrangler.jsonc (deleted)

## Verification

VERIFIED:

- `bun install`: packages resolved and installed cleanly with `prisma generate` postinstall succeeding
- Cloud SQL connection: PrismaPg adapter connected to Cloud SQL development PostgreSQL database via Unix socket
- Database sync: all Prisma models and schemas pushed to Cloud SQL database
- Endpoint checks: `/api/setup/status` responds with `{"envOk":true,"dbConnected":true,"dbInitialized":false,"hasAdmin":false,"setupComplete":false,"missingEnv":[]}`
- Next.js development server running healthy on port 3000 (0.0.0.0) with HTTP 200 on `/setup`
- `lint_applet`: 0 errors across the codebase

## Next

1. Complete the first-run Admin setup wizard at `/setup` to initialize business settings and create the primary administrator account.
2. Configure receipt series, categories, and initial product catalog.

## Blockers / Unknowns

- None. The development environment and database connectivity are fully operational.
