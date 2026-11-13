import Link from "next/link";
import { BookOpenText } from "lucide-react";
import { AvailabilityStatus } from "@/components/showcase/availability-status";
import { ThemeToggle } from "@/components/showcase/theme-toggle";
import { cn } from "@/lib/utils";

// The one top bar for every page (home hero, /posts, each post), so nothing jumps when
// you move between them. The parent supplies the side padding (same on every page:
// max(1.25rem, safe-area) / sm:2.5rem).
//
// "Posts" is a labelled pill with an icon, not a bare word, so it reads as a button to
// anyone. On phones "~/crux" is hidden to make room and the pill leads the bar.
export function SiteBar({ current }: { current: "home" | "posts" }) {
  return (
    <div className="relative z-30 flex items-center justify-between gap-3 pt-[max(1rem,env(safe-area-inset-top))] font-mono sm:pt-6">
      <nav aria-label="Site" className="flex items-center gap-4 text-xs">
        <Link
          href="/"
          aria-current={current === "home" ? "page" : undefined}
          className="hidden text-muted-foreground underline-offset-4 transition-colors hover:text-foreground hover:underline sm:inline"
        >
          ~/crux
        </Link>
        <Link
          href="/posts"
          aria-current={current === "posts" ? "page" : undefined}
          className={cn(
            "flex h-10 items-center gap-2 rounded-full border px-3.5 transition-colors sm:h-8",
            current === "posts"
              ? "border-foreground bg-foreground text-background"
              : "bg-background/80 backdrop-blur hover:bg-muted",
          )}
        >
          <BookOpenText aria-hidden className="size-3.5" />
          Posts
        </Link>
      </nav>
      <div className="flex items-center gap-2">
        <AvailabilityStatus />
        <ThemeToggle className="size-10 sm:size-8" />
      </div>
    </div>
  );
}
