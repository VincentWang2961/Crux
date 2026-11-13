import type { ReactNode } from "react";
import Link from "next/link";
import { ThemeToggle } from "@/components/showcase/theme-toggle";

// Frame for /posts pages: a quiet top bar (path back home + theme toggle) and the footer.
export function PostShell({ path, children }: { path: ReactNode; children: ReactNode }) {
  return (
    <div className="flex min-h-svh flex-col">
      <header className="mx-auto flex w-full max-w-5xl items-center justify-between px-[max(1.25rem,env(safe-area-inset-left))] pt-[max(1rem,env(safe-area-inset-top))] font-mono text-xs text-muted-foreground sm:px-10 sm:pt-6">
        <nav aria-label="Breadcrumb" className="flex items-center gap-1">
          <Link href="/" className="underline-offset-4 hover:text-foreground hover:underline">
            ~/crux
          </Link>
          {path}
        </nav>
        <ThemeToggle className="size-10 sm:size-8" />
      </header>
      <main className="mx-auto w-full max-w-5xl flex-1 px-[max(1.25rem,env(safe-area-inset-left))] py-10 sm:px-10 sm:py-14">
        {children}
      </main>
      <footer className="pb-8 text-center text-xs text-muted-foreground">
        © 2026 Vincent Wang · Built with Next.js & shadcn/ui
      </footer>
    </div>
  );
}
