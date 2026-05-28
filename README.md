# AI Campus Copilot

A smart assistant that helps college students understand campus notices, PDFs,
deadlines, events, and career/placement opportunities. Upload notices, ask
questions in plain English, and get answers grounded in your documents — with
auto-extracted deadlines and a filterable career feed.

Built for a 24–36 hour hackathon. Runnable.

---

## Stack

- **Frontend:** Next.js 14 (App Router) + React + Tailwind, deployed to Vercel
- **Backend:** Next.js API routes (Node runtime for `pdf-parse`)
- **LLM:** Claude (Anthropic API) — `claude-3-5-sonnet-latest` for chat + extraction
- **Embeddings:** Voyage AI `voyage-3-lite` (1024-dim) — Anthropic's recommended pairing
- **Vector store + DB + auth + file storage:** Supabase (Postgres + `pgvector` + Storage)
- **PDF parsing:** `pdf-parse`

---

## Repo layout

```
ai-campus-copilot/
├── README.md                       ← you are here
├── .env.local.example
├── next.config.js
├── package.json
├── tsconfig.json
├── tailwind.config.ts
├── postcss.config.js
├── supabase/
│   └── schema.sql                  ← tables + pgvector + RPCs
├── src/
│   ├── app/
│   │   ├── layout.tsx              ← root shell
│   │   ├── globals.css
│   │   ├── page.tsx                ← redirects to /chat
│   │   ├── (app)/
│   │   │   ├── layout.tsx          ← sidebar
│   │   │   ├── upload/page.tsx
│   │   │   ├── chat/page.tsx
│   │   │   ├── deadlines/page.tsx
│   │   │   └── careers/page.tsx
│   │   └── api/
│   │       ├── ingest/route.ts     ← parse → chunk → embed → store
│   │       ├── chat/route.ts       ← retrieve → LLM (streaming)
│   │       ├── extract/route.ts    ← deadline + career JSON
│   │       └── deadlines/route.ts  ← list
│   ├── lib/
│   │   ├── supabase/
│   │   │   ├── server.ts
│   │   │   ├── client.ts
│   │   │   └── admin.ts
│   │   ├── claude.ts
│   │   ├── embed.ts
│   │   ├── chunk.ts
│   │   ├── pdf.ts
│   │   ├── retrieve.ts
│   │   ├── extract.ts
│   │   └── prompts.ts
│   ├── components/
│   │   ├── UploadDropzone.tsx
│   │   ├── ChatThread.tsx
│   │   ├── CitationChip.tsx
│   │   ├── DeadlineTimeline.tsx
│   │   ├── CareerCard.tsx
│   │   └── ui/
│   │       ├── Button.tsx
│   │       └── Card.tsx
│   └── types/index.ts
└── public/
```

There is also a **`prototype.html`** at the project root — a single-file
clickable UI prototype of all four screens with mock data, useful for showing
investors/judges before the backend is wired.

---

## 1. Setup (15 min)

### 1a. Create a Supabase project

1. Go to <https://supabase.com> → New Project
2. Save the **Project URL**, **anon key**, and **service_role key** from
   Settings → API
3. In the SQL editor, paste and run `supabase/schema.sql` (see below). This
   enables `pgvector`, creates the tables, and adds the `match_chunks` RPC.
4. Storage → New bucket → name it `notices`, set to **private**.

### 1b. Get API keys

- **Anthropic:** <https://console.anthropic.com/> → `ANTHROPIC_API_KEY`
- **Voyage AI:** <https://www.voyageai.com/> → `VOYAGE_API_KEY`

### 1c. Local env

Copy `.env.local.example` → `.env.local` and fill in:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJh...
SUPABASE_SERVICE_ROLE_KEY=eyJh...
ANTHROPIC_API_KEY=sk-ant-...
VOYAGE_API_KEY=pa-...
DEMO_USER_ID=00000000-0000-0000-0000-000000000001
```

### 1d. Install and run

```bash
npm install
npm run dev
```

Open <http://localhost:3000>.

### 1e. Deploy

```bash
vercel
```

Add the same env vars in the Vercel dashboard.

---

## 2. Architecture

### Ingestion pipeline (`POST /api/ingest`)

```
upload file
   │
   ▼
Supabase Storage  ──►  documents row (status='processing')
   │
   ▼
pdf-parse → plain text
   │
   ▼
chunk(text, ~500 words, 80 overlap)
   │
   ▼
Voyage embed(chunks)   ──►  chunks rows (with vector)
   │
   ▼
Claude extract(text)   ──►  deadlines rows + careers row (if applicable)
   │
   ▼
documents.status = 'ready'
```

### Query pipeline (`POST /api/chat`)

```
user question
   │
   ▼
Voyage embed(question)
   │
   ▼
match_chunks RPC (cosine similarity, top-6, threshold 0.3)
   │
   ▼
build context block with [1] [2] [3] tags
   │
   ▼
Claude messages.stream() with strict "answer only from context" prompt
   │
   ▼
SSE → client renders tokens + citation chips
```

### Why this is safe

- The system prompt explicitly forbids answering from training knowledge.
- Every chunk passed to the model carries a citation index.
- If retrieval returns nothing above threshold, the API returns a canned
  "I don't see that in your notices" — no LLM call.

---

## 3. Supabase schema

See `supabase/schema.sql`. Summary:

- `documents(id, user_id, title, storage_path, kind, status, created_at)`
- `chunks(id, doc_id, ord, content, embedding vector(1024), tokens)`
- `deadlines(id, doc_id, title, date, kind, confidence, source_chunk_id)`
- `careers(id, doc_id, company, role, eligibility, ctc, deadline, location, mode)`
- RPC `match_chunks(query_embedding, match_count, similarity_threshold, p_user_id)`

For the hackathon we use a hardcoded `DEMO_USER_ID` instead of real auth.
Swap in `supabase.auth` later — the schema already has `user_id` on documents.

---

## 4. Demo flow (for judging)

1. Open the app — you land in **Chat**. Empty state explains the product.
2. Click **Upload** → drag in the 5 seed PDFs in `public/seed/`.
3. Watch the processing pills flip green.
4. Back to **Chat** → "When is the database midterm?" → cited answer.
5. **Deadlines** → all extracted dates on a timeline.
6. **Careers** → 1 internship card with apply-by date.

---

## 5. Cost guardrails

For a hackathon demo with ~10 PDFs and ~50 questions:
- Voyage embeddings: ~$0.02
- Claude extraction: ~$0.10
- Claude chat: ~$0.20

Total well under $1.

---

## 6. Known shortcuts (call out in your demo)

- Auth is stubbed to one demo user; schema is auth-ready.
- No OCR — image-only PDFs will produce empty text.
- Chunking is word-based, not token-aware. Good enough for notice PDFs.
- No re-ranking; cosine top-k goes straight to the model.
- Career extraction runs only when document text contains hiring keywords.

---

## 7. Where to extend

- Add `supabase.auth` magic links — wire `user_id` from `auth.getUser()`.
- Swap chunker for `tiktoken` token-counting.
- Add Cohere rerank between retrieval and LLM.
- Add `tesseract.js` OCR fallback for scanned PDFs.
- Move embedding to a queue (Inngest / Trigger.dev) for large files.
