import { createClient } from "@supabase/supabase-js";

/**
 * Service-role client. Bypasses RLS — server-side only, and only after an
 * app-level role check (see lib/auth.ts) or inside verified webhooks.
 */
export function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}
