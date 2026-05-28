export type DocumentRow = {
  id: string;
  user_id: string;
  title: string;
  storage_path: string;
  kind: string;
  status: "processing" | "ready" | "failed";
  error: string | null;
  created_at: string;
};

export type DeadlineRow = {
  id: string;
  doc_id: string;
  title: string;
  date: string; // ISO date
  kind: "exam" | "apply" | "event" | "holiday";
  confidence: number;
};

export type CareerRow = {
  id: string;
  doc_id: string;
  company: string;
  role: string;
  eligibility: string | null;
  ctc: string | null;
  apply_by: string | null;
  location: string | null;
  mode: "onsite" | "remote" | "hybrid" | null;
  link: string | null;
};

export type ChatMessage = {
  role: "user" | "assistant";
  content: string;
  citations?: { doc_id: string; doc_title: string }[];
};
