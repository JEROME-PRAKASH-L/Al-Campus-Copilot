import Link from "next/link";
import { BookOpen, Upload, Calendar, Briefcase, MessageSquare } from "lucide-react";

const nav = [
  { href: "/chat", label: "Chat", icon: MessageSquare },
  { href: "/upload", label: "Upload", icon: Upload },
  { href: "/deadlines", label: "Deadlines", icon: Calendar },
  { href: "/careers", label: "Careers", icon: Briefcase },
];

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex">
      <aside className="w-64 shrink-0 border-r border-rule px-5 py-7 flex flex-col gap-1">
        <div className="flex items-center gap-2 mb-8">
          <BookOpen size={18} className="text-accent" />
          <span className="font-serif text-lg leading-none">Campus Copilot</span>
        </div>
        {nav.map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className="flex items-center gap-3 px-2 py-2 rounded-md text-sm text-ink/80 hover:bg-rule/40"
          >
            <Icon size={15} />
            {label}
          </Link>
        ))}
        <div className="mt-auto pt-6 text-[11px] font-mono text-muted">
          demo user · grounded answers only
        </div>
      </aside>
      <main className="flex-1 min-w-0">{children}</main>
    </div>
  );
}
