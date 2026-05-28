"use client";

import { useEffect, useState } from "react";

type Deadline = {
  id: string;
  title: string;
  date: string;
  kind: "exam" | "apply" | "event" | "holiday";
  doc_id: string;
  documents: { title: string };
};

const kindColor: Record<Deadline["kind"], string> = {
  exam:    "bg-red-100 text-red-800",
  apply:   "bg-blue-100 text-blue-800",
  event:   "bg-amber-100 text-amber-800",
  holiday: "bg-emerald-100 text-emerald-800",
};

export default function DeadlinesPage() {
  const [items, setItems] = useState<Deadline[]>([]);

  useEffect(() => {
    fetch("/api/deadlines").then((r) => r.json()).then((j) => setItems(j.deadlines || []));
  }, []);

  // Group by month for the timeline.
  const groups = items.reduce<Record<string, Deadline[]>>((acc, d) => {
    const key = new Date(d.date).toLocaleString("en-US", { month: "long", year: "numeric" });
    (acc[key] = acc[key] || []).push(d);
    return acc;
  }, {});

  return (
    <div className="max-w-3xl mx-auto px-10 py-12">
      <h1 className="font-serif text-3xl mb-1">Deadlines</h1>
      <p className="text-muted text-sm mb-10">
        Extracted automatically from your uploaded notices.
      </p>

      {items.length === 0 && (
        <div className="text-sm text-muted border border-dashed border-rule rounded-lg p-8 text-center">
          No deadlines yet. Upload a notice to populate this view.
        </div>
      )}

      {Object.entries(groups).map(([month, list]) => (
        <section key={month} className="mb-10">
          <h2 className="font-serif text-lg mb-4 text-muted">{month}</h2>
          <ol className="relative border-l border-rule pl-6 space-y-5">
            {list.map((d) => (
              <li key={d.id} className="relative">
                <span className="absolute -left-[31px] top-1 w-2.5 h-2.5 rounded-full bg-accent" />
                <div className="flex items-baseline gap-3 flex-wrap">
                  <div className="font-mono text-xs text-muted w-20 shrink-0">
                    {new Date(d.date).toLocaleDateString("en-US", { month: "short", day: "2-digit" })}
                  </div>
                  <div className="font-serif text-base">{d.title}</div>
                  <span className={`text-[10px] font-mono uppercase px-1.5 py-0.5 rounded ${kindColor[d.kind]}`}>
                    {d.kind}
                  </span>
                </div>
                <div className="text-xs text-muted ml-[92px] -mt-0.5">
                  from {d.documents.title}
                </div>
              </li>
            ))}
          </ol>
        </section>
      ))}
    </div>
  );
}
