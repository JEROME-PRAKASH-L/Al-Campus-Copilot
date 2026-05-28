-- =====================================================================
-- AI Campus Copilot — Supabase schema
-- Run this in Supabase SQL editor after creating a fresh project.
-- =====================================================================

-- 1. Extensions ---------------------------------------------------------
create extension if not exists "uuid-ossp";
create extension if not exists vector;

-- 2. Tables -------------------------------------------------------------

create table if not exists documents (
  id            uuid primary key default uuid_generate_v4(),
  user_id       uuid not null,
  title         text not null,
  storage_path  text not null,
  kind          text default 'notice', -- notice | career | event | other
  status        text default 'processing', -- processing | ready | failed
  error         text,
  created_at    timestamptz default now()
);
create index if not exists documents_user_idx on documents(user_id, created_at desc);

create table if not exists chunks (
  id         uuid primary key default uuid_generate_v4(),
  doc_id     uuid not null references documents(id) on delete cascade,
  ord        int  not null,
  content    text not null,
  tokens     int,
  embedding  vector(1024)
);
create index if not exists chunks_doc_idx on chunks(doc_id);
create index if not exists chunks_embed_idx on chunks
  using ivfflat (embedding vector_cosine_ops) with (lists = 100);

create table if not exists deadlines (
  id              uuid primary key default uuid_generate_v4(),
  doc_id          uuid not null references documents(id) on delete cascade,
  title           text not null,
  date            date not null,
  kind            text default 'event', -- exam | apply | event | holiday
  confidence      real default 0.8,
  source_chunk_id uuid references chunks(id) on delete set null,
  created_at      timestamptz default now()
);
create index if not exists deadlines_date_idx on deadlines(date);

create table if not exists careers (
  id           uuid primary key default uuid_generate_v4(),
  doc_id       uuid not null references documents(id) on delete cascade,
  company      text not null,
  role         text not null,
  eligibility  text,
  ctc          text,
  apply_by     date,
  location     text,
  mode         text, -- onsite | remote | hybrid
  link         text,
  created_at   timestamptz default now()
);
create index if not exists careers_apply_idx on careers(apply_by);

-- 3. Vector search RPC --------------------------------------------------
-- Returns top-k chunks for a query embedding, scoped to a user.
create or replace function match_chunks (
  query_embedding vector(1024),
  match_count int default 6,
  similarity_threshold float default 0.3,
  p_user_id uuid default null
)
returns table (
  chunk_id   uuid,
  doc_id     uuid,
  doc_title  text,
  ord        int,
  content    text,
  similarity float
)
language sql stable as $$
  select
    c.id         as chunk_id,
    c.doc_id     as doc_id,
    d.title      as doc_title,
    c.ord        as ord,
    c.content    as content,
    1 - (c.embedding <=> query_embedding) as similarity
  from chunks c
  join documents d on d.id = c.doc_id
  where (p_user_id is null or d.user_id = p_user_id)
    and d.status = 'ready'
    and 1 - (c.embedding <=> query_embedding) > similarity_threshold
  order by c.embedding <=> query_embedding
  limit match_count;
$$;

-- 4. Storage bucket -----------------------------------------------------
-- In Supabase Dashboard → Storage → New bucket → name "notices", private.
-- (Can't be created via SQL on hosted Supabase.)

-- 5. (Optional) RLS — disabled for hackathon stub auth -----------------
-- For production:
--   alter table documents enable row level security;
--   create policy "own docs" on documents
--     for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
--   ... (chunks/deadlines/careers via doc_id join)
