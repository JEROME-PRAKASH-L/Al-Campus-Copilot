# Coding agent quickstart

You're picking up a hackathon RAG app. Read `CLAUDE.md` at the project root first — that has the architecture, conventions, and a list of what's done vs. what's not.

## Your first session

1. `npm install`
2. Create a Supabase project, run `supabase/schema.sql` in the SQL editor, create a private bucket called `notices`.
3. Copy `.env.local.example` → `.env.local` and fill keys (Supabase URL + anon + service_role, `ANTHROPIC_API_KEY`, `VOYAGE_API_KEY`).
4. `npm run dev` and verify:
   - `/upload` accepts a PDF
   - The doc row flips from `processing` → `ready`
   - `/chat` answers a question about that PDF and shows numbered citation chips
   - `/deadlines` and `/careers` populate

## When you change things

- New API routes that touch `pdf-parse` need `export const runtime = "nodejs"` (Edge can't load it).
- All system prompts live in `src/lib/prompts.ts` — don't inline them.
- Vector dim is 1024. If you change the embedding model, change the schema's `vector(1024)` and the ivfflat index together.
- `src/lib/supabase/admin.ts` uses the service role key. Never import it into a client component.

## Good first PRs

- Wire real `supabase.auth` magic-link flow and replace `getDemoUserId()`.
- Add a `scripts/seed.ts` that uploads the 5 example notice PDFs on first run.
- Add a Supabase Realtime subscription on `documents.status` to remove the upload-page polling.
- Add a Cohere Rerank pass between retrieval and the LLM.
- Add `tesseract.js` OCR fallback in `src/lib/pdf.ts` for image-only PDFs.

## Don't

- Don't import anything from `prototype/` into `src/`. The prototype is a design reference; the real app is under `src/`.
- Don't move the prompts inline.
- Don't drop the empty-retrieval short-circuit in `/api/chat` — it's the cheapest safety net we have.
