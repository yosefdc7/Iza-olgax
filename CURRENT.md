# Current Work

## Objective

Deliver the app-native Daily Sales Ledger and retain the zero-cost Netlify Free + Supabase Free deployment path without committing or pushing.

## Status

Supabase database connection established and verified. 8th migration (`20260904150000_add_daily_sales_ledger`) applied to Supabase, and catalog seeded with 8 products. Local `.env` configured with Supabase PostgreSQL connection strings.

## Completed

- Configured and validated Supabase PostgreSQL connection in `.env` (using transaction pooler on port 6543 and session pooler on port 5432).
- Applied pending migration `20260904150000_add_daily_sales_ledger` to Supabase PostgreSQL database.
- Seeded initial business settings and 8 catalog products via `prisma/seed-catalog.ts`.
- Restored PostgreSQL Prisma/Better Auth runtime using `@prisma/adapter-pg` and `pg`.
- Removed Cloudflare/OpenNext/D1 deployment path and legacy credential seed utilities.
- Added credential-free `prisma/seed-catalog.ts`, Netlify configuration, Supabase Storage integration, and production migration guard.
- Created Supabase project `izah-pos`, applied seven app migrations, created `product-images` bucket, and linked Netlify project `izah-pos`.
- Configured Netlify production non-secret variables for the Supabase URL, bucket, and generated Netlify URL.
- User entered the four required production secrets in Netlify; the public setup status confirms the environment variables are present.
- Published `https://izah-pos.netlify.app` using a Linux Docker build to avoid the Windows Netlify middleware bundling defect.
- Forced `next build --webpack`, removed the pinned Netlify plugin reference/configuration, and corrected setup status to report failed DB authentication as disconnected.
- Added role-aware Reports: admins receive Overview/Stock plus the full Daily Sales Ledger; cashiers receive only their own current-day ledger without cost/profit.
- Added configurable receipt series with transaction-atomic auto-numbering, never-reuse semantics, CSV export, print layout, filters, and receipt-grouped item rows.
- Added decimal quantities/stock, product unit and precision settings, sale-item unit/cost snapshots, and configurable business timezone.
- Added a migration that visibly marks legacy sales as backfilled estimates and updates historical gross profit to use immutable cost snapshots.
- Hardened checkout/refund boundaries: server-authoritative product snapshots, receipt allocation, customer validation, partial-refund locking, remaining-quantity checks, and decimal precision enforcement.
- Checkout now rejects underpaid cash/split tenders while preserving exact-payment compatibility for older queued cash payloads.
- Completed offline checkout replay wiring, including startup replay and single-flight replay serialization to prevent duplicate queued submissions.

## Important Decisions

- Cloudflare Worker, Pages, and D1 resources remain untouched rollback assets.
- Production storage is forced to Supabase in both the Settings UI and server upload path; local storage remains available only outside production.
- User accounts are created by the setup wizard and Settings UI; no fixed production passwords or PINs are seeded.
- Supabase credentials and Better Auth secret must be entered directly into Netlify and are never handled in chat or committed.
- The Google Sheet is a read-only design reference; the ledger is sourced exclusively from Izah POS transactions.
- Legacy receipt references, units, and costs remain visibly labeled as estimates in screen, CSV, and print outputs.
- All CSV report entry points now escape formula-leading cells; the legacy Sales export also honors cashier scope and business-day timezone boundaries.
- CSV escaping preserves numeric values (including negative refunds/profit) as numeric cells.

## Changed Files

- AGENTS.md
- CURRENT.md
- .env.example
- .github/workflows/deploy-cloudflare.yml (deleted)
- CONTRIBUTING.md
- README.md
- docs/architecture.md
- docs/api-reference.md
- docs/contributing.md
- docs/deployment.md
- docs/getting-started.md
- docs/testing.md
- eslint.config.mjs
- netlify.toml
- open-next.config.ts (deleted)
- package.json
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

- `pnpm install --frozen-lockfile`
- `pnpm exec prisma validate`
- `pnpm exec prisma generate`
- `pnpm exec tsc --noEmit`
- `pnpm test --run`: 7 files, 78 tests passed
- `pnpm build`: Next.js production build passed
- Linux Docker `netlify deploy --build --prod`: production deploy completed; Edge middleware and server function bundled successfully
- Public smoke checks: `/api/setup/status` returned `envOk: true` but database authentication failed because the configured Postgres password is invalid/placeholder; root and `/api/ping` correctly redirect to setup before initialization
- `pnpm lint`: exits 0 with existing warnings (generated Prisma output excluded; React Hook Form and legacy client warnings remain)
- Targeted Prettier check passed
- Supabase: project ACTIVE_HEALTHY; 14 public app tables; seven migration records; zero users/products; one product-images bucket
- Netlify project linked: `https://izah-pos.netlify.app`
- Current checkpoint: `pnpm exec prisma validate`, `pnpm exec prisma generate`, `pnpm exec tsc --noEmit`, `pnpm test --run` (78 tests), `pnpm lint` (0 errors; warnings), targeted Prettier, `pnpm build`, and `git diff --check` passed.

## Next

1. Run `pnpm dev` locally and complete the first-run Admin setup wizard at `http://localhost:3000/setup`.
2. Update Netlify environment variables `DATABASE_URL` and `DIRECT_URL` with the new working password so the hosted app at `https://izah-pos.netlify.app` syncs with Supabase.
3. Configure at least one receipt series before checkout and smoke-test decimal products, concurrent numbering, admin/cashier ledger authorization, refunds, CSV, print, offline cache, and reload persistence.

## Blockers / Unknowns

- Supabase advisors report RLS disabled on all public application tables (including `_prisma_migrations`); this was not auto-enabled because adding RLS without app-specific policies would block access. Decide on policies before exposing Supabase’s anon API.
- The latest local checkout/replay/export hardening changes have not been deployed to Netlify; deployment remains intentionally user-controlled.
