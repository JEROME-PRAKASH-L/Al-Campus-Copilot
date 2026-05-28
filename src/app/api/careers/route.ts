import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { getDemoUserId } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** GET /api/careers → list internship/job cards. */
export async function GET(_req: NextRequest) {
  const userId = getDemoUserId();
  const supa = supabaseAdmin();
  const { data, error } = await supa
    .from("careers")
    .select("*, documents!inner(title, user_id)")
    .eq("documents.user_id", userId)
    .order("apply_by", { ascending: true });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ careers: data });
}
