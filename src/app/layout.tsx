import type { Metadata } from "next";
import Link from "next/link";
import "@/app/globals.css";

export const metadata: Metadata = {
  title: "ContextRouter",
  description: "Run-based LLM routing with explainability, compare mode, and chaining."
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <div className="mx-auto flex min-h-screen max-w-7xl flex-col px-4 pb-8 pt-6 md:px-8">
          <header className="mb-6 flex flex-wrap items-center justify-between gap-3 border-b border-ink/10 pb-4">
            <div>
              <Link href="/" className="text-xl font-semibold tracking-tight text-ink">
                ContextRouter
              </Link>
              <p className="text-sm text-ink/70">Run-first orchestration for model routing and comparison</p>
            </div>
            <nav className="flex items-center gap-2">
              <Link href="/" className="button-secondary">
                Sessions
              </Link>
              <Link href="/memory" className="button-secondary">
                Memory
              </Link>
            </nav>
          </header>
          <main className="flex-1">{children}</main>
        </div>
      </body>
    </html>
  );
}
