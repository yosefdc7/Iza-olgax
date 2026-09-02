interface CloudflareEnv {
  DB: D1Database;
  IMAGES_BUCKET?: R2Bucket;
  BETTER_AUTH_SECRET?: string;
  BETTER_AUTH_URL?: string;
  NEXT_PUBLIC_APP_URL?: string;
}
