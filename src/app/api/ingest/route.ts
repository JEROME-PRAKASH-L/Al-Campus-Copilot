import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { getDemoUserId } from "@/lib/supabase/server";
import { extractPdfText } from "@/lib/pdf";
import { chunk } from "@/lib/chunk";
import { embed } from "@/lib/embed";
import { extractStructured } from "@/lib/extract";

// pdf-parse needs Node runtime (not Edge).
export const runtime = "nodejs";
export const maxDuration = 60;

/**
 * POST /api/ingest
 * multipart/form-data: file=<PDF>
 *
 * Flow: upload → parse → chunk → embed → store → extract deadlines/careers.
 * Returns the doc_id and a summary; client polls /api/documents for status.
 */
export async function POST(req: NextRequest) {
  try {
    const form = await req.formData();
    const file = form.get("file") as File | null;
    if (!file) return NextResponse.json({ error: "No file" }, { status: 400 });
    if (!file.name.toLowerCase().endsWith(".pdf")) {
      return NextResponse.json({ error: "PDF only" }, { status: 400 });
    }

    const userId = getDemoUserId();
    const supa = supabaseAdmin();
    const buf = Buffer.from(await file.arrayBuffer());
    const storagePath = `${userId}/${Date.now()}-${file.name}`;

    // 1. Stash file in Storage.
    const up = await supa.storage
      .from("notices")
      .upload(storagePath, buf, { contentType: "application/pdf" });
    if (up.error) throw up.error;

    // 2. Create the document row.
    const { data: doc, error: docErr } = await supa
      .from("documents")
      .insert({
        user_id: userId,
        title: file.name.replace(/\.pdf$/i, ""),
        storage_path: storagePath,
        status: "processing",
      })
      .select()
      .single();
    if (docErr) throw docErr;

    // 3. Parse PDF text.
    const text = await extractPdfText(buf);
    if (!text.trim()) {
      await supa
        .from("documents")
        .update({ status: "failed", error: "No extractable text" })
        .eq("id", doc.id);
      return NextResponse.json(
        { error: "No extractable text — image-only PDF?" },
        { status: 422 }
      );
    }

    // 4. Chunk + embed (batch).
    const chunks = chunk(text);
    const embeddings = await embed(chunks, "document");
    const rows = chunks.map((content, i) => ({
      doc_id: doc.id,
      ord: i,
      content,
      tokens: content.split(/\s+/).length,
      embedding: embeddings[i],
    }));
    const { error: chunkErr } = await supa.from("chunks").insert(rows);
    if (chunkErr) throw chunkErr;

    // 5. Structured extraction (deadlines + career).
    const extracted = await extractStructured(text);
    if (extracted.deadlines.length) {
      await supa.from("deadlines").insert(
        extracted.deadlines.map((d) => ({
          doc_id: doc.id,
          title: d.title,
          date: d.date,
          kind: d.kind,
          confidence: d.confidence,
        }))
      );
    }
    if (extracted.career) {
      await supa.from("careers").insert({
        doc_id: doc.id,
        ...extracted.career,
      });
    }

    // 6. Mark ready + tag kind.
    await supa
      .from("documents")
      .update({ status: "ready", kind: extracted.kind })
      .eq("id", doc.id);

    return NextResponse.json({
      doc_id: doc.id,
      title: doc.title,
      chunks: chunks.length,
      deadlines: extracted.deadlines.length,
      career: !!extracted.career,
    });
  } catch (e: any) {
    console.error("ingest error", e);
    return NextResponse.json(
      { error: e?.message || "ingest failed" },
      { status: 500 }
    );
  }
}
