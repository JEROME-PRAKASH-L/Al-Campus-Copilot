/**
 * Word-window chunker. Good-enough for hackathon. Notice PDFs rarely exceed
 * a few thousand words and don't need token-aware splitting.
 *
 * Splits on whitespace, packs into windows of WORDS_PER_CHUNK with
 * OVERLAP_WORDS shared between adjacent chunks for context bleed.
 */

const WORDS_PER_CHUNK = 500;
const OVERLAP_WORDS = 80;

export function chunk(text: string): string[] {
  const cleaned = text.replace(/\s+/g, " ").trim();
  if (!cleaned) return [];

  const words = cleaned.split(" ");
  if (words.length <= WORDS_PER_CHUNK) return [cleaned];

  const chunks: string[] = [];
  const step = WORDS_PER_CHUNK - OVERLAP_WORDS;
  for (let i = 0; i < words.length; i += step) {
    const slice = words.slice(i, i + WORDS_PER_CHUNK);
    if (!slice.length) break;
    chunks.push(slice.join(" "));
    if (i + WORDS_PER_CHUNK >= words.length) break;
  }
  return chunks;
}
