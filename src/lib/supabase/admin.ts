import { createClient } from "@supabase/supabase-js";

/**
 * Server-side admin client. Uses the service role key — NEVER expose to the
 * browser. Use only inside API routes / server components.
 */
export function supabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
