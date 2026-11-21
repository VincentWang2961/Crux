"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { prefersReducedMotion } from "@/lib/motion";

// Scroll-in reveal. Each descendant with the `.reveal` class rises, fades and un-blurs into
// place the first time *it* scrolls into view (styles in globals.css).
// - Per item, not per block: on a phone a long section comes in piece by piece as you
//   scroll, instead of all at once with the lower items animating off-screen.
// - Items that arrive together (a desktop grid, a short list) are staggered by their `--i`
//   order, relative to the first of them, `STEP_MS` per step, capped at `MAX_STAGGER_MS`,
//   so the first item of every batch starts at once and nothing waits long.
// - The server HTML is fully visible. Only items still below the fold when the page loads
//   are hidden ("wait"), so there is no flash, no-JS readers see everything, and a reload
//   part-way down the page doesn't replay what is already on screen.
// - Reduced motion: nothing is ever hidden.

const STEP_MS = 70;
const MAX_STAGGER_MS = 480;
const FOLD = 0.9; // share of the viewport height: items starting lower are animated

const order = (el: HTMLElement) => parseFloat(el.style.getPropertyValue("--i")) || 0;

export function Reveal({ children, className }: { children: ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const root = ref.current;
    if (!root || prefersReducedMotion()) return;
    const items = Array.from(root.querySelectorAll<HTMLElement>(".reveal")).filter(
      (el) => el.getBoundingClientRect().top >= window.innerHeight * FOLD,
    );
    if (!items.length) return;
    items.forEach((el) => (el.dataset.revealItem = "wait"));

    const io = new IntersectionObserver(
      (entries) => {
        const batch = entries.filter((e) => e.isIntersecting).map((e) => e.target as HTMLElement);
        if (!batch.length) return;
        const first = Math.min(...batch.map(order));
        for (const el of batch) {
          const delay = Math.min((order(el) - first) * STEP_MS, MAX_STAGGER_MS);
          el.style.setProperty("--reveal-delay", `${delay}ms`);
          el.dataset.revealItem = "shown";
          io.unobserve(el);
        }
      },
      { rootMargin: "0px 0px -10% 0px" },
    );
    items.forEach((el) => io.observe(el));

    // A fast fling or an anchor jump can carry an item from below the screen to above it
    // without it ever intersecting: show those at once, so nothing is left hidden.
    let frame = 0;
    const onScroll = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        for (const el of items) {
          if (el.dataset.revealItem === "wait" && el.getBoundingClientRect().bottom < 0) {
            el.dataset.revealItem = "shown";
            io.unobserve(el);
          }
        }
      });
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      io.disconnect();
      cancelAnimationFrame(frame);
      window.removeEventListener("scroll", onScroll);
    };
  }, []);

  return (
    <div ref={ref} className={className}>
      {children}
    </div>
  );
}
