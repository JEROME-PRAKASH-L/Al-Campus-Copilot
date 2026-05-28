import { claude, CLAUDE_HAIKU } from "@/lib/claude";
import { EXTRACT_SYSTEM } from "@/lib/prompts";

export type ExtractedDeadline = {
  title: string;
  date: string;
  kind: "exam" | "apply" | "event" | "holiday";
  confidence: number;
};

export type ExtractedCareer = {
  company: string;
  role: string;
  eligibility: string | null;
  ctc: string | null;
  apply_by: string | null;
  location: string | null;
  mode: "onsite" | "remote" | "hybrid" | null;
  link: string | null;
};

export type ExtractionResult = {
  kind: string;
  deadlines: ExtractedDeadline[];
  career: ExtractedCareer | null;
};

/**
 * Single-shot extractor. Uses Haiku to keep cost down — Sonnet is overkill
 * for structured field extraction from a short notice.
 *
 * We pass the entire document text (capped) rather than chunks, because
 * dates are sometimes spread across pages.
 */
export async function extractStructured(
  fullText: string
): Promise<ExtractionResult> {
  const capped = fullText.slice(0, 24000); // ~6k tokens, plenty for a notice
  const msg = await claude().messages.create({
    model: CLAUDE_HAIKU,
    max_tokens: 1024,
    system: EXTRACT_SYSTEM,
    messages: [
      {
        role: "user",
        content: `NOTICE TEXT:\n"""\n${capped}\n"""\n\nReturn the JSON now.`,
      },
    ],
  });

  const text = msg.content
    .filter((b): b is { type: "text"; text: string } => b.type === "text")
    .map((b) => b.text)
    .join("")
    .trim();

  // Be tolerant of accidental code fences.
  const cleaned = text.replace(/^```(?:json)?/, "").replace(/```$/, "").trim();

  try {
    const parsed = JSON.parse(cleaned) as ExtractionResult;
    return {
      kind: parsed.kind || "notice",
      deadlines: Array.isArray(parsed.deadlines) ? parsed.deadlines : [],
      career: parsed.career ?? null,
    };
  } catch {
    return { kind: "notice", deadlines: [], career: null };
  }
}
