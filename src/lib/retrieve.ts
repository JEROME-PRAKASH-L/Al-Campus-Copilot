import { supabaseAdmin } from "@/lib/supabase/admin";
import { embedOne } from "@/lib/embed";

export type RetrievedChunk = {
  chunk_id: string;
  doc_id: string;
  doc_title: string;
  ord: number;
  content: string;
  similarity: number;
};

export async function retrieve(
  query: string,
  userId: string,
  k = 6
): Promise<RetrievedChunk[]> {
  const queryEmbedding = await embedOne(query, "query");
  const supa = supabaseAdmin();
  const { data, error } = await supa.rpc("match_chunks", {
    query_embedding: queryEmbedding,
    match_count: k,
    similarity_threshold: 0.3,
    p_user_id: userId,
  });
  if (error) throw error;
  return (data ?? []) as RetrievedChunk[];
}

/** Build a numbered context block for the prompt. */
export function formatContext(chunks: RetrievedChunk[]): string {
  return chunks
    .map(
      (c, i) =>
        `[${i + 1}] (from "${c.doc_title}")\n${c.content.trim()}`
    )
    .join("\n\n---\n\n");
}
