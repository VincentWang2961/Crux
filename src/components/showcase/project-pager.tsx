"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

// Pages on the back of a project card (project-flip.tsx), for when one face can't hold it all.
// - The pages sit side by side in a horizontal scroll-snap track, so a swipe (touch or
//   trackpad) turns a page natively, with momentum, and lands on a page edge.
// - The bar at the bottom names the current page and has ‹ › buttons and one dot per page;
//   ←/→ turn pages too while the dialog is open.
// - A page that is still too tall scrolls on its own, and a soft fade at its bottom edge
//   says there is more.
// Reduced motion: page turns jump instead of gliding.

type Page = { label: string; content: ReactNode };

export function ProjectPager({ pages }: { pages: Page[] }) {
  const track = useRef<HTMLDivElement>(null);
  const [index, setIndex] = useState(0);

  const go = (i: number) => {
    const t = track.current;
    if (!t) return;
    const next = Math.max(0, Math.min(pages.length - 1, i));
    const smooth = !window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    t.scrollTo({ left: next * t.clientWidth, behavior: smooth ? "smooth" : "auto" });
  };

  // Follow the scroll position (swipes, buttons, keys) to the nearest page.
  useEffect(() => {
    const t = track.current;
    if (!t) return;
    let frame = 0;
    const onScroll = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => setIndex(Math.round(t.scrollLeft / Math.max(1, t.clientWidth))));
    };
    t.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      cancelAnimationFrame(frame);
      t.removeEventListener("scroll", onScroll);
    };
  }, []);

  // ←/→ anywhere in the open dialog; back to the first page whenever it opens again.
  useEffect(() => {
    const t = track.current;
    const dialog = t?.closest("dialog");
    if (!t || !dialog) return;
    const onKey = (e: KeyboardEvent) => {
      if (!dialog.open || (e.key !== "ArrowLeft" && e.key !== "ArrowRight")) return;
      e.preventDefault();
      const at = Math.round(t.scrollLeft / Math.max(1, t.clientWidth));
      go(at + (e.key === "ArrowRight" ? 1 : -1));
    };
    const reset = new MutationObserver(() => {
      if (dialog.open) t.scrollTo({ left: 0 });
    });
    document.addEventListener("keydown", onKey);
    reset.observe(dialog, { attributes: true, attributeFilter: ["open"] });
    return () => {
      document.removeEventListener("keydown", onKey);
      reset.disconnect();
    };
    // `go` only reads refs and props that don't change while mounted.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const last = pages.length - 1;
  const arrow =
    "grid size-9 place-items-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:pointer-events-none disabled:opacity-30 focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none";

  return (
    <div className="flex h-full flex-col">
      <div
        ref={track}
        className="flex min-h-0 flex-1 snap-x snap-mandatory overflow-x-auto overflow-y-hidden overscroll-x-contain [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {pages.map((p, i) => (
          <section
            key={p.label}
            aria-label={`${p.label}, page ${i + 1} of ${pages.length}`}
            inert={i !== index}
            className="h-full w-full shrink-0 snap-start snap-always overflow-y-auto overscroll-y-contain [mask-image:linear-gradient(to_bottom,#000_calc(100%-2rem),transparent)]"
          >
            <div className="px-6 pt-6 pb-10 sm:px-8 sm:pt-8">{p.content}</div>
          </section>
        ))}
      </div>

      <nav aria-label="Pages" className="flex items-center gap-2 border-t px-3 py-2">
        <button type="button" onClick={() => go(index - 1)} disabled={index === 0} aria-label="Previous page" className={arrow}>
          <ChevronLeft className="size-4" />
        </button>
        <div className="flex min-w-0 flex-1 flex-col items-center gap-1.5">
          <span aria-live="polite" className="truncate font-mono text-xs text-muted-foreground">
            {pages[index]?.label} · {index + 1}/{pages.length}
          </span>
          <div className="flex gap-1.5">
            {pages.map((p, i) => (
              <button
                key={p.label}
                type="button"
                onClick={() => go(i)}
                aria-label={`Go to ${p.label}`}
                aria-current={i === index ? "page" : undefined}
                className={cn(
                  "h-1.5 rounded-full transition-all duration-300",
                  i === index ? "w-5 bg-foreground" : "w-1.5 bg-foreground/25 hover:bg-foreground/50",
                )}
              />
            ))}
          </div>
        </div>
        <button type="button" onClick={() => go(index + 1)} disabled={index === last} aria-label="Next page" className={arrow}>
          <ChevronRight className="size-4" />
        </button>
      </nav>
    </div>
  );
}
