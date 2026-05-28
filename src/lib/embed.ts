/**
 * Voyage AI embeddings. Anthropic recommends Voyage for Claude-paired RAG.
 * https://docs.voyageai.com/docs/embeddings
 *
 * voyage-3-lite → 1024-dim, $0.02 / 1M tokens.
 */

const VOYAGE_URL = "https://api.voyageai.com/v1/embeddings";
const MODEL = "voyage-3-lite";

type VoyageResponse = {
  data: { embedding: number[]; index: number }[];
  usage: { total_tokens: number };
};

export async function embed(
  texts: string[],
  inputType: "query" | "document" = "document"
): Promise<number[][]> {
  if (!texts.length) return [];
  const res = await fetch(VOYAGE_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.VOYAGE_API_KEY}`,
    },
    body: JSON.stringify({ input: texts, model: MODEL, input_type: inputType }),
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Voyage embed failed (${res.status}): ${body}`);
  }
  const json = (await res.json()) as VoyageResponse;
  // Sort by index to be safe — Voyage normally returns in order.
  return json.data.sort((a, b) => a.index - b.index).map((d) => d.embedding);
}

export async function embedOne(
  text: string,
  inputType: "query" | "document" = "query"
): Promise<number[]> {
  const [v] = await embed([text], inputType);
  return v;
}
