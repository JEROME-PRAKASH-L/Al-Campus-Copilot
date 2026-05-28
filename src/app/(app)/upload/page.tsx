"use client";

import { useEffect, useState } from "react";
import { Upload, FileText, Check, Loader2, X } from "lucide-react";

type Doc = {
  id: string;
  title: string;
  kind: string;
  status: "processing" | "ready" | "failed";
  error?: string | null;
  created_at: string;
};

export default function UploadPage() {
  const [docs, setDocs] = useState<Doc[]>([]);
  const [uploading, setUploading] = useState(false);
  const [drag, setDrag] = useState(false);

  async function refresh() {
    const r = await fetch("/api/documents");
    const j = await r.json();
    setDocs(j.documents || []);
  }
  useEffect(() => { refresh(); }, []);

  async function upload(files: FileList | File[]) {
    setUploading(true);
    for (const f of Array.from(files)) {
      const fd = new FormData();
      fd.append("file", f);
      try { await fetch("/api/ingest", { method: "POST", body: fd }); }
      catch { /* ignore — surface in row */ }
    }
    setUploading(false);
    refresh();
  }

  return (
    <div className="max-w-3xl mx-auto px-10 py-12">
      <h1 className="font-serif text-3xl mb-1">Upload notices</h1>
      <p className="text-muted mb-8 text-sm">
        PDFs only. We extract text, index it for retrieval, and pull out any deadlines or career postings.
      </p>

      <label
        onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
        onDragLeave={() => setDrag(false)}
        onDrop={(e) => {
          e.preventDefault(); setDrag(false);
          if (e.dataTransfer.files) upload(e.dataTransfer.files);
        }}
        className={`block border-2 border-dashed rounded-xl p-12 text-center cursor-pointer transition
          ${drag ? "border-accent bg-accent/5" : "border-rule hover:border-accent/50"}`}
      >
        <input
          type="file" accept="application/pdf" multiple hidden
          onChange={(e) => e.target.files && upload(e.target.files)}
        />
        <Upload size={28} className="mx-auto mb-3 text-accent" />
        <div className="font-serif text-lg">Drop PDFs here</div>
        <div className="text-sm text-muted mt-1">or click to browse</div>
      </label>

      {uploading && (
        <div className="mt-4 text-sm text-muted flex items-center gap-2">
          <Loader2 size={14} className="animate-spin" /> Uploading…
        </div>
      )}

      <h2 className="font-serif text-xl mt-12 mb-3">Library</h2>
      <div className="divide-y divide-rule border border-rule rounded-lg overflow-hidden">
        {docs.length === 0 && (
          <div className="px-4 py-6 text-sm text-muted">No documents yet.</div>
        )}
        {docs.map((d) => (
          <div key={d.id} className="flex items-center gap-3 px-4 py-3">
            <FileText size={16} className="text-muted shrink-0" />
            <div className="flex-1 min-w-0">
              <div className="text-sm truncate">{d.title}</div>
              <div className="text-[11px] font-mono text-muted">
                {d.kind} · {new Date(d.created_at).toLocaleString()}
              </div>
            </div>
            <StatusPill status={d.status} />
          </div>
        ))}
      </div>
    </div>
  );
}

function StatusPill({ status }: { status: Doc["status"] }) {
  if (status === "ready")
    return (
      <span className="inline-flex items-center gap-1 text-[11px] font-mono text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">
        <Check size={11} /> ready
      </span>
    );
  if (status === "failed")
    return (
      <span className="inline-flex items-center gap-1 text-[11px] font-mono text-red-700 bg-red-50 px-2 py-0.5 rounded-full">
        <X size={11} /> failed
      </span>
    );
  return (
    <span className="inline-flex items-center gap-1 text-[11px] font-mono text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full">
      <Loader2 size={11} className="animate-spin" /> processing
    </span>
  );
}
