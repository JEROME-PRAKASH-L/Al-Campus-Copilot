/* global React, ReactDOM, SEED, TweaksPanel, useTweaks, TweakSection, TweakRadio, TweakColor, TweakSelect */
const { useState, useEffect, useRef, useMemo } = React;

/* =========================================================================
 * AI Campus Copilot — clickable prototype
 *
 * Single-file React app that demonstrates the four product surfaces with
 * seed data: Chat (with mini-RAG over the seed chunks), Upload, Deadlines,
 * Careers. Real backend lives in src/app/api/* — this exists so judges /
 * teammates can click through the UX without a Supabase project.
 * ========================================================================= */

// ---------- Type-style chips for deadlines / career mode ---------------------
const KIND_STYLE = {
  exam:    { bg: "rgba(220, 38, 38, 0.08)",  fg: "#9b1c1c", label: "EXAM" },
  apply:   { bg: "rgba(37, 99, 235, 0.08)",  fg: "#1e3a8a", label: "APPLY" },
  event:   { bg: "rgba(217, 119, 6, 0.10)",  fg: "#92400e", label: "EVENT" },
  holiday: { bg: "rgba(5, 150, 105, 0.09)",  fg: "#065f46", label: "HOLIDAY" },
};

const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
  "accent":   "#7a5230",
  "density":  "comfortable",
  "headline": "serif"
}/*EDITMODE-END*/;

// ---------- Root ------------------------------------------------------------
function App() {
  const [tab, setTab] = useState("chat");
  const [tweaks, setTweak] = useTweaks(TWEAK_DEFAULTS);

  // Apply tweak values to CSS vars so styles cascade.
  useEffect(() => {
    document.documentElement.style.setProperty("--accent", tweaks.accent);
    document.documentElement.style.setProperty(
      "--density-y",
      tweaks.density === "compact" ? "8px" : "16px"
    );
    document.documentElement.style.setProperty(
      "--headline-font",
      tweaks.headline === "sans"
        ? "Inter, system-ui, sans-serif"
        : "'Source Serif 4', Georgia, serif"
    );
  }, [tweaks]);

  return (
    <div className="app">
      <Sidebar tab={tab} setTab={setTab} />
      <main className="surface" data-screen-label={tab}>
        {tab === "chat"      && <ChatScreen />}
        {tab === "upload"    && <UploadScreen />}
        {tab === "deadlines" && <DeadlinesScreen />}
        {tab === "careers"   && <CareersScreen />}
      </main>

      <TweaksPanel title="Tweaks">
        <TweakSection title="Look">
          <TweakColor
            label="Accent"
            value={tweaks.accent}
            onChange={(v) => setTweak("accent", v)}
            options={["#7a5230", "#3b6e4f", "#1f3a68", "#7d2f3a"]}
          />
          <TweakRadio
            label="Headline font"
            value={tweaks.headline}
            onChange={(v) => setTweak("headline", v)}
            options={[
              { value: "serif", label: "Serif" },
              { value: "sans",  label: "Sans" },
            ]}
          />
          <TweakRadio
            label="Density"
            value={tweaks.density}
            onChange={(v) => setTweak("density", v)}
            options={[
              { value: "comfortable", label: "Comfy" },
              { value: "compact",     label: "Compact" },
            ]}
          />
        </TweakSection>
      </TweaksPanel>
    </div>
  );
}

// ---------- Sidebar ---------------------------------------------------------
function Sidebar({ tab, setTab }) {
  const nav = [
    { id: "chat",      label: "Chat",      icon: IconChat },
    { id: "upload",    label: "Upload",    icon: IconUpload },
    { id: "deadlines", label: "Deadlines", icon: IconCalendar },
    { id: "careers",   label: "Careers",   icon: IconBriefcase },
  ];
  return (
    <aside className="sidebar">
      <div className="brand">
        <span className="brand-mark" />
        <span className="brand-text">Campus Copilot</span>
      </div>
      <nav>
        {nav.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={`nav-item ${tab === id ? "active" : ""}`}
          >
            <Icon />
            <span>{label}</span>
          </button>
        ))}
      </nav>
      <div className="sidebar-footer">
        <div className="user-pill">
          <span className="user-avatar">A</span>
          <div>
            <div className="user-name">Aanya · 3rd year</div>
            <div className="user-meta">CSE · demo workspace</div>
          </div>
        </div>
        <div className="footer-mono">grounded answers · RAG over your PDFs</div>
      </div>
    </aside>
  );
}

// ---------- Chat ------------------------------------------------------------
function ChatScreen() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [pending, setPending] = useState(false);
  const scrollRef = useRef(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: 9e9, behavior: "smooth" });
  }, [messages, pending]);

  async function ask(q) {
    const question = (q ?? input).trim();
    if (!question || pending) return;
    setInput("");
    setPending(true);

    // Retrieve: simple keyword/substring scoring over seed chunks.
    const retrieved = retrieveChunks(question);
    const citations = retrieved.map((r, i) => ({
      index: i + 1, doc: r.doc, similarity: r.score,
    }));

    setMessages((m) => [
      ...m,
      { role: "user", content: question },
      { role: "assistant", content: "", citations, status: "thinking" },
    ]);

    let answer;
    if (retrieved.length === 0) {
      answer = "I don't see that in your uploaded notices.";
    } else if (typeof window.claude?.complete === "function") {
      try {
        const context = retrieved
          .map((r, i) => `[${i + 1}] (from "${r.doc}")\n${r.text}`)
          .join("\n\n---\n\n");
        const prompt = [
          "You are AI Campus Copilot.",
          "Answer the student's question using ONLY the excerpts below.",
          "Cite excerpt numbers like [1] or [2] inline.",
          "If the excerpts don't contain the answer, say exactly: \"I don't see that in your uploaded notices.\"",
          "Be concise (≤4 sentences). No fluff, no emoji.",
          "",
          "EXCERPTS:",
          context,
          "",
          "QUESTION: " + question,
        ].join("\n");
        answer = await window.claude.complete(prompt);
      } catch {
        answer = composeOfflineAnswer(question, retrieved);
      }
    } else {
      answer = composeOfflineAnswer(question, retrieved);
    }

    // Fake streaming for feel.
    await streamInto(answer, (next) =>
      setMessages((m) => {
        const copy = [...m];
        copy[copy.length - 1] = { ...copy[copy.length - 1], content: next, status: "streaming" };
        return copy;
      })
    );
    setMessages((m) => {
      const copy = [...m];
      copy[copy.length - 1] = { ...copy[copy.length - 1], status: "done" };
      return copy;
    });
    setPending(false);
  }

  return (
    <div className="chat-screen">
      <header className="screen-header">
        <div>
          <h1 className="display">Ask your notices</h1>
          <p className="subtle">Every answer cites the source PDF. Nothing else.</p>
        </div>
        <div className="header-meta">
          <span className="mono-pill">{SEED.documents.filter(d => d.status === "ready").length} docs indexed</span>
        </div>
      </header>

      <div ref={scrollRef} className="chat-scroll">
        <div className="chat-inner">
          {messages.length === 0 && <ChatEmpty onPick={ask} />}
          {messages.map((m, i) => <Bubble key={i} msg={m} />)}
          {pending && messages[messages.length - 1]?.content === "" && (
            <div className="thinking">
              <span /><span /><span />
              <span className="thinking-label">retrieving from {SEED.documents.length} docs…</span>
            </div>
          )}
        </div>
      </div>

      <div className="composer">
        <div className="composer-inner">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && ask()}
            placeholder="When is the database midterm?"
            disabled={pending}
          />
          <button onClick={() => ask()} disabled={!input.trim() || pending}>
            {pending ? "…" : "Ask"}
          </button>
        </div>
        <div className="composer-meta">
          <span className="mono">grounded · top-6 cosine · cite-or-decline</span>
        </div>
      </div>
    </div>
  );
}

function ChatEmpty({ onPick }) {
  const samples = [
    "When is the database midterm?",
    "What's the stipend for the Acme internship?",
    "List every deadline before April 1.",
    "Is the library open on Holi?",
  ];
  return (
    <div className="empty">
      <div className="empty-eyebrow mono">grounded q&a</div>
      <h2 className="empty-title">Your campus, on demand.</h2>
      <p className="empty-body">
        Drop a notice into Upload, then ask anything. Answers come back with
        numbered citations so you can verify each claim against the source PDF.
      </p>
      <div className="empty-suggestions">
        {samples.map((s) => (
          <button key={s} className="suggestion" onClick={() => onPick(s)}>
            <span className="suggestion-arrow">→</span> {s}
          </button>
        ))}
      </div>
    </div>
  );
}

function Bubble({ msg }) {
  if (msg.role === "user") {
    return (
      <div className="bubble-row user">
        <div className="bubble bubble-user">{msg.content}</div>
      </div>
    );
  }
  return (
    <div className="bubble-row assistant">
      <div className="assistant-eyebrow mono">Copilot</div>
      <div className="bubble-text">{renderWithCitations(msg.content, msg.citations || [])}</div>
      {msg.citations && msg.citations.length > 0 && (
        <div className="citations">
          {msg.citations.map((c) => (
            <span key={c.index} className="citation-chip">
              <span className="citation-n">[{c.index}]</span>
              <span className="citation-doc">{c.doc}</span>
              <span className="citation-sim mono">{c.similarity.toFixed(2)}</span>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

function renderWithCitations(text, citations) {
  const parts = text.split(/(\[\d+\])/g);
  return parts.map((p, i) => {
    const m = p.match(/^\[(\d+)\]$/);
    if (!m) return <span key={i}>{p}</span>;
    const n = Number(m[1]);
    const c = citations.find((x) => x.index === n);
    return (
      <sup key={i} className="inline-citation" title={c?.doc || ""}>{n}</sup>
    );
  });
}

// ---------- Upload ----------------------------------------------------------
const INGEST_STEPS = ["parse", "chunk", "embed", "extract"];

function UploadScreen() {
  const [drag, setDrag] = useState(false);
  const [docs, setDocs] = useState(() =>
    SEED.documents.map((d) => (d.status === "processing" ? { ...d, step: "parse" } : d))
  );
  const scheduled = useRef(new Set());

  function advance(id, step) {
    setDocs((d) => d.map((x) => (x.id === id && x.status === "processing" ? { ...x, step } : x)));
  }
  function finish(id) {
    setDocs((d) => d.map((x) => (x.id === id ? { ...x, status: "ready", step: undefined } : x)));
  }

  function scheduleIngest(id) {
    if (scheduled.current.has(id)) return;
    scheduled.current.add(id);
    INGEST_STEPS.slice(1).forEach((step, i) => {
      setTimeout(() => advance(id, step), 700 * (i + 1));
    });
    setTimeout(() => {
      finish(id);
      scheduled.current.delete(id);
    }, 700 * INGEST_STEPS.length);
  }

  // Kick the pipeline for any processing doc we haven't scheduled yet.
  useEffect(() => {
    docs.forEach((d) => {
      if (d.status === "processing") scheduleIngest(d.id);
    });
  }, [docs]);

  function fakeDrop() {
    const id = "d" + Math.random().toString(36).slice(2, 7);
    const newDoc = {
      id,
      title: "New Campus Notice " + new Date().toLocaleTimeString(),
      kind: "notice",
      status: "processing",
      step: "parse",
      created_at: new Date().toISOString(),
    };
    setDocs((d) => [newDoc, ...d]);
  }

  return (
    <div className="screen-pad">
      <header className="screen-header">
        <div>
          <h1 className="display">Upload notices</h1>
          <p className="subtle">PDFs go in, structured knowledge comes out.</p>
        </div>
      </header>

      <div
        className={`dropzone ${drag ? "drag" : ""}`}
        onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
        onDragLeave={() => setDrag(false)}
        onDrop={(e) => { e.preventDefault(); setDrag(false); fakeDrop(); }}
        onClick={fakeDrop}
      >
        <div className="drop-icon"><IconUpload /></div>
        <div className="drop-title">Drop campus PDFs here</div>
        <div className="drop-sub">or click to simulate an upload</div>
        <div className="drop-pipeline mono">
          parse → chunk(500w/80 overlap) → embed(voyage-3-lite) → store(pgvector) → extract
        </div>
      </div>

      <section className="library">
        <div className="library-head">
          <h2 className="section-title">Library</h2>
          <span className="mono-pill">{docs.length} documents</span>
        </div>
        <div className="lib-list">
          {docs.map((d) => (
            <div key={d.id} className="lib-row">
              <div className="lib-thumb"><IconDoc /></div>
              <div className="lib-meta">
                <div className="lib-title">{d.title}</div>
                <div className="lib-sub mono">
                  {d.kind} · {timeAgo(d.created_at)}
                </div>
                {d.status === "processing" && <IngestSteps current={d.step || "parse"} />}
              </div>
              <StatusPill status={d.status} step={d.step} />
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

function StatusPill({ status, step }) {
  if (status === "ready")
    return <span className="pill pill-ok"><span className="dot" />ready</span>;
  if (status === "failed")
    return <span className="pill pill-bad">failed</span>;
  return (
    <span className="pill pill-busy">
      <span className="spinner" />
      {step || "processing"}
    </span>
  );
}

function IngestSteps({ current }) {
  const idx = INGEST_STEPS.indexOf(current);
  return (
    <ol className="ingest-steps" aria-label="Ingest pipeline progress">
      {INGEST_STEPS.map((step, i) => {
        const state =
          i < idx ? "done" :
          i === idx ? "active" :
          "pending";
        return (
          <li key={step} className={`ingest-step ingest-step-${state}`}>
            <span className="ingest-step-bar" />
            <span className="ingest-step-label mono">{step}</span>
          </li>
        );
      })}
    </ol>
  );
}

// ---------- Deadlines -------------------------------------------------------
function DeadlinesScreen() {
  const [view, setView] = useState("timeline");
  const items = SEED.deadlines;

  const groups = useMemo(() => {
    return items.reduce((acc, d) => {
      const key = new Date(d.date).toLocaleString("en-US", { month: "long", year: "numeric" });
      (acc[key] = acc[key] || []).push(d);
      return acc;
    }, {});
  }, [items]);

  return (
    <div className="screen-pad">
      <header className="screen-header">
        <div>
          <h1 className="display">Deadlines</h1>
          <p className="subtle">Auto-extracted from your notices. Confidence shown per item.</p>
        </div>
        <div className="seg">
          <button className={view === "timeline" ? "on" : ""} onClick={() => setView("timeline")}>Timeline</button>
          <button className={view === "calendar" ? "on" : ""} onClick={() => setView("calendar")}>Calendar</button>
        </div>
      </header>

      {view === "timeline" ? (
        Object.entries(groups).map(([month, list]) => (
          <section key={month} className="month">
            <h3 className="month-title">{month}</h3>
            <ol className="timeline">
              {list.map((d) => {
                const style = KIND_STYLE[d.kind];
                return (
                  <li key={d.id} className="timeline-row">
                    <span className="timeline-dot" />
                    <div className="tl-date mono">
                      {new Date(d.date).toLocaleDateString("en-US", { month: "short", day: "2-digit" })}
                    </div>
                    <div className="tl-body">
                      <div className="tl-title">{d.title}</div>
                      <div className="tl-source mono">from {d.doc}</div>
                    </div>
                    <span className="kind-chip" style={{ background: style.bg, color: style.fg }}>
                      {style.label}
                    </span>
                  </li>
                );
              })}
            </ol>
          </section>
        ))
      ) : (
        <CalendarView items={items} />
      )}
    </div>
  );
}

function CalendarView({ items }) {
  // Render a grid per month that actually has items, in chronological order.
  const months = useMemo(() => {
    const seen = new Map();
    items.forEach((d) => {
      const dt = new Date(d.date);
      const key = dt.getFullYear() * 12 + dt.getMonth();
      if (!seen.has(key)) seen.set(key, { year: dt.getFullYear(), month: dt.getMonth() });
    });
    return [...seen.values()].sort((a, b) => (a.year - b.year) || (a.month - b.month));
  }, [items]);

  if (!months.length) {
    return <div className="cal"><div className="cal-head">No deadlines yet</div></div>;
  }
  return (
    <div className="cal-stack">
      {months.map((m) => (
        <MonthGrid key={`${m.year}-${m.month}`} year={m.year} month={m.month} items={items} />
      ))}
    </div>
  );
}

function MonthGrid({ year, month, items }) {
  const first = new Date(year, month, 1);
  const startDow = first.getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells = [];
  for (let i = 0; i < startDow; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  while (cells.length % 7) cells.push(null);

  const byDay = items.reduce((acc, d) => {
    const dt = new Date(d.date);
    if (dt.getFullYear() === year && dt.getMonth() === month) {
      (acc[dt.getDate()] = acc[dt.getDate()] || []).push(d);
    }
    return acc;
  }, {});

  const heading = first.toLocaleString("en-US", { month: "long", year: "numeric" });

  return (
    <div className="cal">
      <div className="cal-head">{heading}</div>
      <div className="cal-grid">
        {["Sun","Mon","Tue","Wed","Thu","Fri","Sat"].map((d, i) => (
          <div key={i} className="cal-dow mono">{d}</div>
        ))}
        {cells.map((c, i) => (
          <div key={i} className={`cal-cell ${!c ? "empty" : ""}`}>
            {c && <div className="cal-day mono">{c}</div>}
            {c && (byDay[c] || []).map((d) => (
              <div key={d.id} className="cal-item"
                   style={{ background: KIND_STYLE[d.kind].bg, color: KIND_STYLE[d.kind].fg }}
                   title={d.title}>
                {d.title}
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

// ---------- Careers ---------------------------------------------------------
function CareersScreen() {
  const [mode, setMode] = useState("all");
  const filtered = SEED.careers.filter((c) => mode === "all" || c.mode === mode);

  return (
    <div className="screen-pad">
      <header className="screen-header">
        <div>
          <h1 className="display">Career feed</h1>
          <p className="subtle">Hiring notices, pulled into structured cards.</p>
        </div>
      </header>

      <div className="seg seg-tight">
        {["all", "onsite", "remote", "hybrid"].map((m) => (
          <button key={m} className={mode === m ? "on" : ""} onClick={() => setMode(m)}>
            {m}
          </button>
        ))}
      </div>

      <div className="cards">
        {filtered.map((c) => (
          <article key={c.id} className="card">
            <header className="card-head">
              <div>
                <div className="card-role">{c.role}</div>
                <div className="card-company">{c.company}</div>
              </div>
              {c.mode && <span className="mode-chip mono">{c.mode}</span>}
            </header>
            <dl className="card-rows">
              <Row label="Stipend" value={c.ctc} />
              <Row label="Eligible" value={c.eligibility} />
              <Row label="Location" value={c.location} />
              <Row label="Apply by" value={c.apply_by ? niceDate(c.apply_by) : null} accent />
            </dl>
            <footer className="card-foot mono">from {c.doc}</footer>
          </article>
        ))}
      </div>
    </div>
  );
}

function Row({ label, value, accent }) {
  if (!value) return null;
  return (
    <div className="row">
      <dt className="mono">{label}</dt>
      <dd className={accent ? "accent" : ""}>{value}</dd>
    </div>
  );
}

// ---------- Helpers ---------------------------------------------------------
function composeOfflineAnswer(question, retrieved) {
  const tokens = (question.toLowerCase().match(/[a-z0-9]+/g) || []).filter((t) => t.length > 2);
  const picked = [];
  for (let i = 0; i < retrieved.length && picked.length < 2; i++) {
    const sentences = retrieved[i].text.match(/[^.!?]+[.!?]+/g) || [retrieved[i].text];
    let best = null;
    let bestScore = 0;
    for (const s of sentences) {
      const hay = s.toLowerCase();
      let score = 0;
      for (const t of tokens) if (hay.includes(t)) score += 1;
      if (score > bestScore) { bestScore = score; best = s.trim(); }
    }
    if (best) picked.push({ idx: i + 1, sentence: best });
  }
  if (!picked.length) {
    return retrieved[0].text.split(/(?<=[.!?])\s+/)[0].trim() + " [1]";
  }
  return picked.map((p) => `${p.sentence} [${p.idx}]`).join(" ");
}

function retrieveChunks(query) {
  // Score each seed chunk by keyword overlap + tiny doc-title boost.
  const tokens = (query.toLowerCase().match(/[a-z0-9]+/g) || []).filter(t => t.length > 2);
  if (!tokens.length) return [];
  const scored = SEED.chunks.map((ch) => {
    const hay = (ch.doc + " " + ch.text).toLowerCase();
    let score = 0;
    for (const t of tokens) if (hay.includes(t)) score += 1;
    return { ...ch, score: score / tokens.length };
  });
  return scored.filter((s) => s.score > 0.15).sort((a, b) => b.score - a.score).slice(0, 4);
}

function streamInto(full, push) {
  return new Promise((resolve) => {
    let i = 0;
    const tick = () => {
      i += Math.max(1, Math.round(Math.random() * 6));
      push(full.slice(0, i));
      if (i < full.length) setTimeout(tick, 18);
      else resolve();
    };
    tick();
  });
}

function niceDate(iso) {
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "2-digit", year: "numeric" });
}

function timeAgo(iso) {
  const ms = Date.now() - new Date(iso).getTime();
  const d = Math.floor(ms / 86400000);
  if (d < 1) return "today";
  if (d < 2) return "yesterday";
  return d + "d ago";
}

// ---------- Icons (inline SVG so we don't ship a sprite) --------------------
const Svg = ({ children }) => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">{children}</svg>
);
const IconChat      = () => <Svg><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></Svg>;
const IconUpload    = () => <Svg><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></Svg>;
const IconCalendar  = () => <Svg><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></Svg>;
const IconBriefcase = () => <Svg><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/></Svg>;
const IconDoc       = () => <Svg><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></Svg>;

// ---------- Mount -----------------------------------------------------------
ReactDOM.createRoot(document.getElementById("root")).render(<App />);
