import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { getDemoUserId } from "@/lib/supabase/server";

export const runtime = "nodejs";

/** GET /api/deadlines → list, joined to source document title. */
export async function GET(_req: NextRequest) {
  const userId = getDemoUserId();
  const supa = supabaseAdmin();
  const { data, error } = await supa
    .from("deadlines")
    .select("id, title, date, kind, confidence, doc_id, documents!inner(title, user_id)")
    .eq("documents.user_id", userId)
    .order("date", { ascending: true });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ deadlines: data });
}
