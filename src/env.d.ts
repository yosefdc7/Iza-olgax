declare namespace NodeJS {
  interface ProcessEnv {
    DATABASE_URL?: string;
    DIRECT_URL?: string;
    BETTER_AUTH_SECRET?: string;
    BETTER_AUTH_URL?: string;
    NEXT_PUBLIC_APP_URL?: string;
    SUPABASE_URL?: string;
    SUPABASE_SERVICE_ROLE_KEY?: string;
    SUPABASE_STORAGE_BUCKET?: string;
  }
}
