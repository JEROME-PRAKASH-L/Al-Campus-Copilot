"use client";

import { useState, useRef, useEffect } from "react";
import { Send, Loader2 } from "lucide-react";

type Citation = { index: number; doc_id: string; doc_title: string; similarity: number };
type Msg = { role: "user" | "assistant"; content: string; citations?: Citation[] };

export default function ChatPage() {
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [pending, setPending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: 9e9, behavior: "smooth" });
  }, [messages, pending]);

  async function ask() {
    const q = input.trim();
    if (!q || pending) return;
    setInput("");
    const history = messages.map((m) => ({ role: m.role, content: m.content }));
    setMessages((m) => [
      ...m,
      { role: "user", content: q },
      { role: "assistant", content: "", citations: [] },
    ]);
    setPending(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: q, history }),
      });
      if (!res.body) throw new Error("no body");

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buf = "";

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buf += decoder.decode(value, { stream: true });

        // Parse SSE blocks delimited by blank line.
        let idx;
        while ((idx = buf.indexOf("\n\n")) >= 0) {
          const block = buf.slice(0, idx);
          buf = buf.slice(idx + 2);
          const lines = block.split("\n");
          const ev = lines.find((l) => l.startsWith("event:"))?.slice(6).trim();
          const data = lines.find((l) => l.startsWith("data:"))?.slice(5).trim() ?? "";

          if (ev === "citations") {
            const citations = JSON.parse(data || "[]") as Citation[];
            setMessages((m) => {
              const copy = [...m];
              copy[copy.length - 1] = { ...copy[copy.length - 1], citations };
              return copy;
            });
          } else if (ev === "token") {
            setMessages((m) => {
              const copy = [...m];
              copy[copy.length - 1] = {
                ...copy[copy.length - 1],
                content: copy[copy.length - 1].content + data,
              };
              return copy;
            });
          }
        }
      }
    } catch (e) {
      setMessages((m) => {
        const copy = [...m];
        copy[copy.length - 1] = { role: "assistant", content: "Something went wrong." };
        return copy;
      });
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="flex flex-col h-screen">
      <header className="px-10 py-5 border-b border-rule">
        <h1 className="font-serif text-2xl">Ask your notices</h1>
        <p className="text-xs text-muted mt-0.5">Answers cite the source PDF. Nothing else.</p>
      </header>

      <div ref={scrollRef} className="flex-1 overflow-y-auto px-10 py-8">
        <div className="max-w-2xl mx-auto space-y-6">
          {messages.length === 0 && <EmptyState onPick={setInput} />}
          {messages.map((m, i) => (
            <Bubble key={i} msg={m} />
          ))}
        </div>
      </div>

      <div className="border-t border-rule px-10 py-4">
        <div className="max-w-2xl mx-auto flex items-center gap-2">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && ask()}
            placeholder="When is the database midterm?"
            className="flex-1 bg-white border border-rule rounded-lg px-4 py-3 text-sm focus:outline-none focus:border-accent"
          />
          <button
            onClick={ask}
            disabled={pending || !input.trim()}
            className="bg-ink text-paper rounded-lg px-4 py-3 disabled:opacity-40"
          >
            {pending ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
          </button>
        </div>
      </div>
    </div>
  );
}

function Bubble({ msg }: { msg: Msg }) {
  if (msg.role === "user")
    return (
      <div className="flex justify-end">
        <div className="bg-ink text-paper rounded-2xl px-4 py-2 max-w-[80%] text-sm">
          {msg.content}
        </div>
      </div>
    );
  return (
    <div>
      <div className="text-[11px] font-mono uppercase text-muted mb-1.5">Copilot</div>
      <div className="text-[15px] leading-relaxed whitespace-pre-wrap">
        {renderCitations(msg.content, msg.citations || [])}
      </div>
      {msg.citations && msg.citations.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {msg.citations.map((c) => (
            <span
              key={c.index}
              className="text-[11px] font-mono text-muted border border-rule rounded-full px-2 py-0.5"
            >
              [{c.index}] {c.doc_title}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

function renderCitations(text: string, citations: Citation[]) {
  // Inline citation chips: convert [1] [2] tokens into highlighted spans.
  const parts = text.split(/(\[\d+\])/g);
  return parts.map((p, i) => {
    const m = p.match(/^\[(\d+)\]$/);
    if (!m) return <span key={i}>{p}</span>;
    const n = Number(m[1]);
    const c = citations.find((x) => x.index === n);
    return (
      <sup
        key={i}
        title={c?.doc_title}
        className="text-[10px] font-mono text-accent bg-accent/10 rounded px-1 ml-0.5"
      >
        {n}
      </sup>
    );
  });
}

function EmptyState({ onPick }: { onPick: (q: string) => void }) {
  const samples = [
    "When is the database midterm?",
    "What's the eligibility for the Acme internship?",
    "List every deadline in March.",
    "Is the Friday holiday confirmed?",
  ];
  return (
    <div className="text-center pt-16">
      <div className="font-serif text-2xl mb-2">Grounded in your uploads.</div>
      <p className="text-sm text-muted max-w-md mx-auto mb-8">
        Upload notices on the left, then ask anything. Every answer cites the source.
      </p>
      <div className="flex flex-wrap gap-2 justify-center">
        {samples.map((s) => (
          <button
            key={s}
            onClick={() => onPick(s)}
            className="text-xs text-muted border border-rule rounded-full px-3 py-1.5 hover:bg-white hover:text-ink"
          >
            {s}
          </button>
        ))}
      </div>
    </div>
  );
}
