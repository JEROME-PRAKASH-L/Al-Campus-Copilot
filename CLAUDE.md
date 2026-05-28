# AI Campus Copilot — Claude Code instructions

This file is read by Claude Code on every session. Keep it terse and current.

## What this project is

A hackathon-grade RAG app for college students:
- Upload campus notice PDFs → text is extracted, chunked, embedded, stored.
- Ask questions in plain English → answers grounded in the user's docs, with citations.
- Auto-extract deadlines + career postings into structured views.

## Stack (do not swap without asking)

- Next.js 14 (App Router) + TypeScript + Tailwind
- Supabase: Postgres + `pgvector` + Storage + Auth
- LLM: Claude via `@anthropic-ai/sdk` (`claude-3-5-sonnet-latest` for chat, `claude-3-5-haiku-latest` for structured extraction)
- Embeddings: Voyage AI `voyage-3-lite` (1024-dim) — Anthropic's recommended pairing
- PDF parsing: `pdf-parse` (Node runtime only — set `runtime = "nodejs"` in any route that imports it)

## Repo map

```
src/
  app/
    (app)/{chat,upload,deadlines,careers}/page.tsx   ← UI screens
    api/{ingest,chat,documents,deadlines,careers}/route.ts
  lib/
    supabase/{server,client,admin}.ts                ← three clients, three roles
    claude.ts          ← SDK singleton + model constants
    embed.ts           ← Voyage wrapper (embed / embedOne)
    chunk.ts           ← 500-word window, 80-word overlap
    pdf.ts             ← lazy-required pdf-parse
    retrieve.ts        ← match_chunks RPC + formatContext()
    extract.ts         ← Haiku → strict JSON { deadlines, career }
    prompts.ts         ← CHAT_SYSTEM + EXTRACT_SYSTEM (single source of truth)
  types/index.ts
supabase/schema.sql    ← run once in Supabase SQL editor
prototype/             ← clickable HTML mockup (design reference, not runtime code)
prototype.html
```

## Environment variables (`.env.local`)

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
ANTHROPIC_API_KEY=
VOYAGE_API_KEY=
DEMO_USER_ID=00000000-0000-0000-0000-000000000001
```

`SUPABASE_SERVICE_ROLE_KEY` is server-only — never expose to the browser, never import `supabase/admin.ts` into client components.

## How the RAG pipeline is wired

### Ingest (`POST /api/ingest`, Node runtime, multipart `file`)
1. Upload buffer to Storage bucket `notices` at `${userId}/${ts}-${name}`.
2. Insert `documents` row, status `processing`.
3. `extractPdfText(buf)` → if empty, mark `failed` and return 422.
4. `chunk(text)` → 500-word windows with 80-word overlap.
5. `embed(chunks, "document")` → batch Voyage call.
6. Insert all `chunks` rows with their `embedding` vectors.
7. `extractStructured(text)` → insert `deadlines` and (optionally) one `careers` row.
8. Update `documents.status = 'ready'` and `kind`.

### Chat (`POST /api/chat`, Node runtime, JSON, SSE response)
1. `embedOne(question, "query")` → call `match_chunks` RPC (top-6, threshold 0.3, user-scoped).
2. If retrieval is empty, return a canned "I don't see that in your uploaded notices." — no LLM call.
3. Otherwise stream Claude with `CHAT_SYSTEM` and a context block tagged `[1] [2] [3]`.
4. SSE events: `citations` (once, JSON payload), `token` (many), `done` (once).

## Database schema invariants

- Every `chunks` row belongs to one `documents` row; cascade delete.
- `documents.status` lifecycle: `processing → ready` or `processing → failed`.
- `deadlines.kind ∈ {exam, apply, event, holiday}`. `careers.mode ∈ {onsite, remote, hybrid}`.
- Vector dim is **1024** (matches `voyage-3-lite`). If you swap embedding models, update `vector(1024)`, the ivfflat index, and `match_chunks`.

## Hackathon shortcuts in the code

These are deliberate. Call them out before "fixing":

- **Auth is stubbed.** `getDemoUserId()` returns `DEMO_USER_ID`. Schema already has `user_id` on `documents` — wire `supabase.auth.getUser()` when ready.
- **No RLS.** Commented out in `schema.sql`. Turn on when auth is real.
- **No OCR.** Image-only PDFs return 422. Add `tesseract.js` fallback in `lib/pdf.ts` if needed.
- **Word chunker, not token chunker.** Good enough for short notices. Swap to `tiktoken` if docs get long.
- **No reranker.** Cosine top-k goes straight to the model.
- **Career extraction always runs.** It just returns `career: null` for non-hiring docs.

## Prototype vs. production code

- `prototype.html` + `prototype/*` is a **design reference** built with React+Babel inline JSX, fake streaming, and mock data. Do not import from there into `src/`.
- The real app lives under `src/`. Style tokens (paper / ink / accent) are in `tailwind.config.ts` and `src/app/globals.css`.

## Conventions

- Server-only modules (anything importing `supabase/admin.ts`, `pdf-parse`, or `claude.ts`) must live under `src/app/api/*` or be imported only by server components.
- All system prompts go in `src/lib/prompts.ts`. Don't inline prompts in route handlers.
- API routes that touch `pdf-parse` need `export const runtime = "nodejs"`.
- New extractor types: add to `EXTRACT_SYSTEM`, extend `ExtractionResult` in `lib/extract.ts`, add a table + insert step in `/api/ingest`.

## Common tasks

- **Add a new route**: `src/app/api/<name>/route.ts`. Default to Node runtime.
- **Add a new screen**: `src/app/(app)/<name>/page.tsx`. Add nav entry in `src/app/(app)/layout.tsx`.
- **Tune retrieval**: `match_count` and `similarity_threshold` in `lib/retrieve.ts:retrieve()`.
- **Tune extraction**: `EXTRACT_SYSTEM` in `lib/prompts.ts`. Keep the JSON schema in the prompt in sync with the TypeScript type.

## Run + deploy

```bash
npm install
npm run dev            # http://localhost:3000
vercel                 # deploy; mirror env vars in the dashboard
```

## What's already done

✅ Repo scaffold, configs, schema, all lib helpers, all four API routes, all four screens, clickable HTML prototype with seed data.

## What's intentionally not done (good starter tasks)

- Real Supabase Auth (magic link) — schema is ready, just swap `getDemoUserId()`.
- A `scripts/seed.ts` that uploads the 5 demo PDFs at first run.
- OCR fallback for image-only PDFs.
- Reranking step (Cohere Rerank or a small Claude pass) between retrieval and answer.
- Citation chips that link to a PDF viewer with the exact chunk highlighted.
- Realtime status on the upload page (Supabase Realtime on `documents.status`).
