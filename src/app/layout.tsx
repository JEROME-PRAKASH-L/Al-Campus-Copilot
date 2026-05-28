import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "AI Campus Copilot",
  description: "Ask your campus notices.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
