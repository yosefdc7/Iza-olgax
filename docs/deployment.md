# Deployment Guide

How to deploy Izah POS in production.

---

## Table of Contents

- [Cloudflare Native Stack (Recommended)](#cloudflare-native-stack-recommended)
  - [Architecture Overview](#architecture-overview)
  - [Step 1: Prerequisites & Wrangler Login](#step-1-prerequisites--wrangler-login)
  - [Step 2: Create Cloudflare D1 Database](#step-2-create-cloudflare-d1-database)
  - [Step 3: Create Cloudflare R2 Bucket (Image Storage)](#step-3-create-cloudflare-r2-bucket-image-storage)
  - [Step 4: Update `wrangler.jsonc`](#step-4-update-wranglerjsonc)
  - [Step 5: Deploy via Git Integration (Zero-Config CI/CD)](#step-5-deploy-via-git-integration-zero-config-cicd)
  - [Step 6: Direct CLI Deployment Alternative](#step-6-direct-cli-deployment-alternative)
- [Docker Compose (Self-Hosted)](#docker-compose-self-hosted)
- [Serverless Deployments (Vercel / Netlify)](#serverless-deployments-vercel--netlify)
- [Production Environment Variables Checklist](#production-environment-variables-checklist)
- [Updating](#updating)

---

## Cloudflare Native Stack (Recommended)

Izah POS can run **100% natively inside Cloudflare**, eliminating external databases and third-party hosting dependencies.

### Architecture Overview

| Component | Cloudflare Service | Description |
|---|---|---|
| **App & API Server** | Cloudflare Workers / Pages | Next.js 16 App Router powered by `@opennextjs/cloudflare` |
| **Database** | Cloudflare D1 | Serverless SQLite database at the edge with `@prisma/adapter-d1` |
| **Product Images** | Cloudflare R2 | S3-compatible object storage with **0 egress fees** |
| **CDN & DNS** | Cloudflare Edge Network | Global DDoS protection, SSL, and low-latency asset delivery |

---

### Step 1: Prerequisites & Wrangler Login

Make sure you have Node.js 20+ and pnpm installed, then log in to your Cloudflare account from your terminal:

```bash
npx wrangler login
```

---

### Step 2: Create Cloudflare D1 Database

Run the following command in your terminal to create your serverless D1 database:

```bash
npx wrangler d1 create izah-pos-db
```

Wrangler will output your database details:
```toml
[[d1_databases]]
binding = "DB"
database_name = "izah-pos-db"
database_id = "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
```

Save the `database_id` string for Step 4.

---

### Step 3: Create Cloudflare R2 Bucket (Image Storage)

Create an R2 bucket for storing product pictures:

```bash
npx wrangler r2 bucket create izah-pos-images
```

#### Enable Public Bucket URL:
1. In the [Cloudflare Dashboard](https://dash.cloudflare.com/), go to **R2** &rarr; **Overview** &rarr; `izah-pos-images`.
2. Navigate to **Settings** &rarr; **Public Access**.
3. Click **Connect Domain** to link a custom subdomain (e.g. `media.yourshop.com`) or enable the default **R2.dev Subdomain** (e.g. `https://pub-xxx.r2.dev`).

#### Create R2 API Tokens (for uploads):
1. In Cloudflare Dashboard, go to **R2** &rarr; **Manage R2 API Tokens**.
2. Click **Create API Token**, select **Object Read & Write**, and set TTL/permissions.
3. Save the `Access Key ID`, `Secret Access Key`, and `Endpoint URL`.

---

### Step 4: Update `wrangler.jsonc`

Open [`wrangler.jsonc`](file:///c:/Users/josef/Documents/antigravity/gallant-goodall/izah-pos/wrangler.jsonc) and replace `YOUR_D1_DATABASE_ID_HERE` with your actual database ID from Step 2:

```jsonc
{
  "$schema": "node_modules/wrangler/config-schema.json",
  "name": "izah-pos",
  "main": ".open-next/worker.js",
  "compatibility_date": "2024-12-30",
  "compatibility_flags": ["nodejs_compat"],
  "assets": {
    "directory": ".open-next/assets",
    "binding": "ASSETS"
  },
  "d1_databases": [
    {
      "binding": "DB",
      "database_name": "izah-pos-db",
      "database_id": "YOUR_ACTUAL_D1_DATABASE_ID"
    }
  ],
  "r2_buckets": [
    {
      "binding": "IMAGES_BUCKET",
      "bucket_name": "izah-pos-images"
    }
  ],
  "vars": {
    "BETTER_AUTH_URL": "https://your-subdomain.pages.dev",
    "NEXT_PUBLIC_APP_URL": "https://your-subdomain.pages.dev"
  }
}
```

---

### Step 5: Deploy via Git Integration (Zero-Config CI/CD)

The simplest, automated way to deploy is linking your GitHub or GitLab repository to Cloudflare:

1. Push your repository to GitHub:
   ```bash
   git add .
   git commit -m "feat: configure cloudflare native stack [antigravity]"
   git push origin main
   ```
2. Open the [Cloudflare Dashboard](https://dash.cloudflare.com/) &rarr; **Compute (Workers & Pages)** &rarr; **Create application** &rarr; **Pages** &rarr; **Connect to Git**.
3. Select your `izah-pos` repository.
4. **Build Settings**:
   - **Framework preset**: `None`
   - **Build command**: `npx @opennextjs/cloudflare build`
   - **Build output directory**: `.open-next/assets`
   - **Root directory**: `/` (or leave blank)
5. **Environment Variables & Secrets**:
   - `BETTER_AUTH_SECRET`: Generate a 48+ char secret (`openssl rand -base64 48`)
   - `BETTER_AUTH_URL`: `https://<your-project>.pages.dev` (or your custom domain)
   - `NEXT_PUBLIC_APP_URL`: `https://<your-project>.pages.dev`
   - `NODE_ENV`: `production`
6. **Bindings**:
   - Go to **Settings** &rarr; **Functions** &rarr; **D1 database bindings** &rarr; Add binding `DB` connected to `izah-pos-db`.
   - Go to **Settings** &rarr; **Functions** &rarr; **R2 bucket bindings** &rarr; Add binding `IMAGES_BUCKET` connected to `izah-pos-images`.
7. Click **Save and Deploy**. Cloudflare builds on global edge containers and deploys automatically on every `git push`!

---

### Step 6: Direct CLI Deployment Alternative

To deploy manually directly from your command line:

```bash
pnpm run deploy
```

---

## Docker Compose (Self-Hosted)

For running on your own VPS or local server:

```bash
# 1. Clone the repo
git clone https://github.com/izah/izah-pos.git
cd izah-pos

# 2. Set production environment
cp .env.example .env
nano .env

# 3. Build and start
NEXT_STANDALONE=1 docker compose up -d --build

# 4. Check logs
docker compose logs -f web
```

The web service will be available on port **3000**. Put it behind Nginx or Caddy for HTTPS.

---

## Serverless Deployments (Vercel / Netlify)

1. Import project in Vercel/Netlify.
2. Build command: `npx prisma generate && next build`.
3. Set `DATABASE_URL` to your remote database (e.g. Neon or Supabase).

---

## Production Environment Variables Checklist

| Variable | Required | Description | Example |
|---|---|---|---|
| `BETTER_AUTH_SECRET` | **Yes** | 32+ character random secret for signing tokens | `openssl rand -base64 48` |
| `BETTER_AUTH_URL` | **Yes** | Canonical public URL | `https://pos.yourshop.com` |
| `NEXT_PUBLIC_APP_URL` | **Yes** | Public frontend URL | `https://pos.yourshop.com` |
| `NODE_ENV` | **Yes** | Environment mode | `production` |
| `R2_ACCOUNT_ID` | Optional | Cloudflare account ID for R2 storage | `abc12345...` |
| `R2_ACCESS_KEY_ID` | Optional | R2 API token access key | `xyz...` |
| `R2_SECRET_ACCESS_KEY` | Optional | R2 API token secret | `secret...` |
| `R2_BUCKET_NAME` | Optional | Name of R2 images bucket | `izah-pos-images` |
| `R2_PUBLIC_URL` | Optional | Public CDN or custom domain URL for images | `https://media.yourshop.com` |

---

## Updating

When a new version is released:

### Cloudflare Pages
Simply push your updates to `main` branch. Cloudflare will automatically build and deploy the update with zero downtime.

### Docker
```bash
git pull origin main
docker compose up -d --build
```
