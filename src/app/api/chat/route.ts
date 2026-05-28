import { NextRequest } from "next/server";
import { claude, CLAUDE_MODEL } from "@/lib/claude";
import { retrieve, formatContext } from "@/lib/retrieve";
import { CHAT_SYSTEM } from "@/lib/prompts";
import { getDemoUserId } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const maxDuration = 60;

/**
 * POST /api/chat
 * body: { question: string, history?: {role, content}[] }
 *
 * Streams the answer back as Server-Sent Events:
 *   event: citations    (once, up front)
 *   event: token        (many)
 *   event: done         (once)
 */
export async function POST(req: NextRequest) {
  const { question, history = [] } = (await req.json()) as {
    question: string;
    history?: { role: "user" | "assistant"; content: string }[];
  };
  if (!question?.trim()) {
    return new Response("missing question", { status: 400 });
  }

  const userId = getDemoUserId();
  const chunks = await retrieve(question, userId, 6);

  // Empty-retrieval guard — short-circuit, no LLM call.
  if (!chunks.length) {
    return sse(async (send) => {
      send("citations", JSON.stringify([]));
      send("token", "I don't see that in your uploaded notices.");
      send("done", "");
    });
  }

  const context = formatContext(chunks);
  const userPrompt = `CONTEXT:\n${context}\n\nQUESTION: ${question}`;

  // Citations payload — one entry per [n] tag in the prompt.
  const citations = chunks.map((c, i) => ({
    index: i + 1,
    doc_id: c.doc_id,
    doc_title: c.doc_title,
    similarity: c.similarity,
  }));

  return sse(async (send) => {
    send("citations", JSON.stringify(citations));

    const stream = await claude().messages.stream({
      model: CLAUDE_MODEL,
      max_tokens: 800,
      system: CHAT_SYSTEM,
      messages: [
        ...history.slice(-6),
        { role: "user", content: userPrompt },
      ],
    });

    for await (const event of stream) {
      if (
        event.type === "content_block_delta" &&
        event.delta.type === "text_delta"
      ) {
        send("token", event.delta.text);
      }
    }
    send("done", "");
  });
}

/** Tiny SSE helper. */
function sse(
  run: (send: (event: string, data: string) => void) => Promise<void>
) {
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const send = (event: string, data: string) => {
        controller.enqueue(
          encoder.encode(`event: ${event}\ndata: ${data}\n\n`)
        );
      };
      try {
        await run(send);
      } catch (e: any) {
        send("error", e?.message || "stream failed");
      } finally {
        controller.close();
      }
    },
  });
  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
