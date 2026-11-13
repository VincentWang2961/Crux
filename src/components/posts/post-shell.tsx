import type { ReactNode } from "react";
import { SiteBar, type Crumb } from "@/components/site/site-bar";

// Frame for /posts pages: the same top bar as the home page (same padding, same place)
// showing the path and a back button, then the page content and the footer.
export function PostShell({
  crumbs,
  back,
  children,
}: {
  crumbs: Crumb[];
  back: { href: string; label: string };
  children: ReactNode;
}) {
  return (
    <div className="flex min-h-svh flex-col px-[max(1.25rem,env(safe-area-inset-left))] sm:px-10">
      <SiteBar crumbs={crumbs} back={back} />
      <main className="mx-auto w-full max-w-5xl flex-1 py-8 sm:py-12">{children}</main>
      <footer className="pb-8 text-center text-xs text-muted-foreground">
        © 2026 Vincent Wang · Built with Next.js & shadcn/ui
      </footer>
    </div>
  );
}
