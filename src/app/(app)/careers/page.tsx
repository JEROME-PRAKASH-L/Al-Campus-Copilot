"use client";

import { useEffect, useState } from "react";
import { MapPin, IndianRupee, GraduationCap, Calendar } from "lucide-react";

type Career = {
  id: string;
  company: string;
  role: string;
  eligibility: string | null;
  ctc: string | null;
  apply_by: string | null;
  location: string | null;
  mode: "onsite" | "remote" | "hybrid" | null;
  documents: { title: string };
};

export default function CareersPage() {
  const [items, setItems] = useState<Career[]>([]);
  const [mode, setMode] = useState<"all" | "onsite" | "remote" | "hybrid">("all");

  useEffect(() => {
    fetch("/api/careers").then((r) => r.json()).then((j) => setItems(j.careers || []));
  }, []);

  const filtered = items.filter((c) => mode === "all" || c.mode === mode);

  return (
    <div className="max-w-4xl mx-auto px-10 py-12">
      <h1 className="font-serif text-3xl mb-1">Career feed</h1>
      <p className="text-muted text-sm mb-6">
        Internship and placement notices, extracted as structured cards.
      </p>

      <div className="flex gap-1 mb-6">
        {(["all", "onsite", "remote", "hybrid"] as const).map((m) => (
          <button
            key={m}
            onClick={() => setMode(m)}
            className={`text-xs font-mono uppercase px-3 py-1.5 rounded-full border transition
              ${mode === m ? "bg-ink text-paper border-ink" : "border-rule text-muted hover:border-ink"}`}
          >
            {m}
          </button>
        ))}
      </div>

      {filtered.length === 0 && (
        <div className="text-sm text-muted border border-dashed border-rule rounded-lg p-8 text-center">
          No career postings detected yet.
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filtered.map((c) => (
          <article key={c.id} className="border border-rule rounded-xl p-5 bg-white">
            <div className="flex items-start justify-between gap-3 mb-3">
              <div>
                <div className="font-serif text-lg leading-tight">{c.role}</div>
                <div className="text-sm text-muted">{c.company}</div>
              </div>
              {c.mode && (
                <span className="text-[10px] font-mono uppercase border border-rule rounded-full px-2 py-0.5 text-muted">
                  {c.mode}
                </span>
              )}
            </div>
            <dl className="space-y-1.5 text-sm">
              {c.ctc && <Row icon={IndianRupee}>{c.ctc}</Row>}
              {c.eligibility && <Row icon={GraduationCap}>{c.eligibility}</Row>}
              {c.location && <Row icon={MapPin}>{c.location}</Row>}
              {c.apply_by && (
                <Row icon={Calendar}>
                  Apply by {new Date(c.apply_by).toLocaleDateString("en-US", { month: "short", day: "2-digit" })}
                </Row>
              )}
            </dl>
            <div className="text-[11px] font-mono text-muted mt-4 pt-3 border-t border-rule">
              from {c.documents.title}
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}

function Row({ icon: Icon, children }: { icon: any; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2 text-ink/80">
      <Icon size={13} className="text-muted shrink-0" />
      {children}
    </div>
  );
}
