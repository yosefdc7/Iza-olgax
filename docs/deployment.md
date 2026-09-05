# Deployment Guide

Izah POS is deployed as a standard Next.js application on Netlify Free with
Supabase Free providing PostgreSQL and product-image storage.

## Architecture

| Component           | Service                  | Notes                                        |
| ------------------- | ------------------------ | -------------------------------------------- |
| App and API routes  | Netlify                  | Next.js server functions and static assets   |
| Relational database | Supabase PostgreSQL      | Prisma migrations and Better Auth data       |
| Product images      | Supabase Storage         | Server-side uploads using a service-role key |
| Offline cache       | Browser PGLite/IndexedDB | Device-local; unchanged by deployment        |

Cloudflare Worker, Pages, and D1 resources are not required for this deployment
and remain untouched as rollback assets.

## 1. Create Supabase resources

1. Create a Supabase project in the nearest region.
2. Create a public Storage bucket named `product-images` so the existing
   product-image URL contract remains directly readable by the POS client.
3. Copy the transaction-pooler connection string for runtime traffic and the
   session/direct connection string for migrations.
4. Keep the service-role key server-only. Never place it in a `NEXT_PUBLIC_`
   variable or commit it to the repository.

## 2. Configure local deployment variables

Set these values in a local, ignored `.env` file and in Netlify production
environment variables:

```env
DATABASE_URL="postgresql://postgres.<ref>:<password>@aws-0-<region>.pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=1"
DIRECT_URL="postgresql://postgres.<ref>:<password>@aws-0-<region>.pooler.supabase.com:5432/postgres"
BETTER_AUTH_SECRET="<random-value-at-least-32-characters>"
BETTER_AUTH_URL="https://<site>.netlify.app"
NEXT_PUBLIC_APP_URL="https://<site>.netlify.app"
SUPABASE_URL="https://<ref>.supabase.co"
SUPABASE_SERVICE_ROLE_KEY="<server-only-service-role-key>"
SUPABASE_STORAGE_BUCKET="product-images"
NODE_ENV="production"
```

## 3. Initialize the fresh database

Run migrations before the first production request:

```bash
pnpm install --frozen-lockfile
pnpm db:generate
pnpm exec prisma migrate deploy
```

Do not run the legacy seed because it contains publicly documented sample
passwords and PINs. Open the deployed app’s setup wizard to create the first
Admin with user-chosen credentials, then create Cashier users from Settings.
Load sample catalog data only after the Admin is created.

## 4. Deploy to Netlify

The repository includes `netlify.toml` with Node 22 and `pnpm build`. Netlify
automatically applies its current Next.js adapter; no runtime plugin is pinned
in the repository. Deploy the current working tree without committing it:

```bash
npx netlify login
npx netlify init
npx netlify deploy --build --prod
```

On Windows, run the deploy command from a Linux environment (for example,
Docker or CI) if Netlify middleware bundling reports a missing
`webpack-runtime.js` or `turbopack` file. The application code and middleware do
not need to change for that workaround.

Use the generated `netlify.app` URL as `BETTER_AUTH_URL` and
`NEXT_PUBLIC_APP_URL`, then redeploy if those values were not known during the
first build.

## 5. Verify

- `pnpm lint`, `pnpm exec tsc --noEmit`, `npx vitest run`, and `pnpm build` pass.
- Setup status, Admin login, four-digit PIN unlock, Cashier switching, role
  restrictions, products, sales, customers, refunds, reports, offline search,
  and reload persistence work from a clean browser session.
- JPEG, PNG, WebP, and GIF uploads return public Supabase Storage URLs; invalid,
  oversized, and unauthenticated uploads are rejected.
- No Cloudflare Worker or Pages request is required for the live app.

### Supabase security-advisor follow-up

The fresh project currently reports RLS disabled on the public application
tables. The app uses direct server-side Prisma credentials rather than the
Supabase anon API, but do not expose an anon key until app-specific policies
are reviewed. To apply deny-by-default protection for the public API, run this
SQL in Supabase after confirming that the server database role remains able to
operate as intended:

```sql
ALTER TABLE public."User" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."Session" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."Account" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."Verification" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."Product" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."Sale" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."SaleItem" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."HeldOrder" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."BusinessSettings" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."Customer" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."LoyaltyLog" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."StockAdjustment" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."Supplier" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."Refund" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."_prisma_migrations" ENABLE ROW LEVEL SECURITY;
```

## Free-tier boundaries

Netlify Free and Supabase Free are suitable for low-volume use only. Monitor
Netlify’s monthly credits and Supabase’s database, storage, bandwidth, and
inactivity limits before using this deployment for sustained commercial traffic.
