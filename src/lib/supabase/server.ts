import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";

export function supabaseServer() {
  const store = cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get: (name) => store.get(name)?.value,
        set: () => {},
        remove: () => {},
      },
    }
  );
}

/** Stubbed auth for the hackathon — returns the env-configured demo user. */
export function getDemoUserId(): string {
  return (
    process.env.DEMO_USER_ID || "00000000-0000-0000-0000-000000000001"
  );
}
