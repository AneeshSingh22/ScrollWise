import "server-only";

import { createClient as createSupabaseClient } from "@supabase/supabase-js";

/**
 * Service-key client. Bypasses row-level security, so it is only for the
 * nightly pipeline and other trusted server-side work — never a user request.
 *
 * The "server-only" import above makes the build fail if this is ever
 * imported into a Client Component, which would ship the secret to browsers.
 */
export function createAdminClient() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY is not set");
  }

  return createSupabaseClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
