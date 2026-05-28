import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { getDemoUserId } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** GET /api/documents → list user's documents with status. */
export async function GET(_req: NextRequest) {
  const userId = getDemoUserId();
  const supa = supabaseAdmin();
  const { data, error } = await supa
    .from("documents")
    .select("id, title, kind, status, created_at, error")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ documents: data });
}
