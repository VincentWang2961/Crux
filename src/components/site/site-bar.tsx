import { Fragment } from "react";
import Link from "next/link";
import { BookOpenText } from "lucide-react";
import { AvailabilityStatus } from "@/components/showcase/availability-status";
import { BackLink } from "@/components/posts/back-link";
import { ThemeToggle } from "@/components/showcase/theme-toggle";

export type Crumb = { label: string; href?: string };

// The one top bar for every page, so nothing moves between pages. The parent supplies
// the side padding (max(1.25rem, safe-area) / sm:2.5rem); the bar sets the top padding.
//
// - Home: "~/crux" + a "Posts" pill (icon + label, so it reads as a button to anyone) on
//   the left; the availability pill and theme toggle on the right.
// - Deeper pages: the path as a terminal-style breadcrumb on the left
//   ("~/crux/posts/<slug>", each part a link, the last one truncated), and one clearly
//   labelled back button plus the theme toggle on the right.
export function SiteBar({ crumbs = [], back }: { crumbs?: Crumb[]; back?: { href: string; label: string } }) {
  const isHome = crumbs.length === 0;
  return (
    <div className="relative z-30 flex items-center justify-between gap-3 pt-[max(1rem,env(safe-area-inset-top))] font-mono sm:pt-6">
      {isHome ? (
        <nav aria-label="Site" className="flex items-center gap-4 text-xs">
          <span aria-current="page" className="hidden text-muted-foreground sm:inline">
            ~/crux
          </span>
          <Link
            href="/posts"
            className="flex h-10 items-center gap-2 rounded-full border bg-background/80 px-3.5 backdrop-blur transition-colors hover:bg-muted sm:h-8"
          >
            <BookOpenText aria-hidden className="size-3.5" />
            Posts
          </Link>
        </nav>
      ) : (
        <nav aria-label="Breadcrumb" className="flex min-w-0 items-center text-xs text-muted-foreground">
          <Link href="/" className="shrink-0 underline-offset-4 transition-colors hover:text-foreground hover:underline">
            ~/crux
          </Link>
          {crumbs.map((c, i) => {
            const last = i === crumbs.length - 1;
            return (
              <Fragment key={c.label}>
                <span aria-hidden className="shrink-0">
                  /
                </span>
                {c.href && !last ? (
                  <Link
                    href={c.href}
                    className="shrink-0 underline-offset-4 transition-colors hover:text-foreground hover:underline"
                  >
                    {c.label}
                  </Link>
                ) : (
                  <span aria-current="page" title={c.label} className="min-w-0 truncate text-foreground">
                    {c.label}
                  </span>
                )}
              </Fragment>
            );
          })}
        </nav>
      )}

      <div className="flex shrink-0 items-center gap-2">
        {back ? <BackLink href={back.href} label={back.label} className="sm:h-8" /> : <AvailabilityStatus />}
        <ThemeToggle className="size-10 sm:size-8" />
      </div>
    </div>
  );
}
