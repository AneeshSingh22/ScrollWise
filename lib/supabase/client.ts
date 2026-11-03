import { createBrowserClient } from "@supabase/ssr";

/**
 * Supabase client for Client Components. Safe to expose: the publishable key
 * only grants what row-level security allows.
 */
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}
