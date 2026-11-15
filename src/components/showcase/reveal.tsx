"use client";

import { useEffect, useRef, type ReactNode } from "react";

// Scroll-in reveal. Descendants with the `.reveal` class (stagger index in `--i`) rise,
// fade and un-blur into place the first time this block scrolls into view; styles are in
// globals.css. The server HTML is fully visible: the block is only "armed" (hidden) on the
// client when it starts below the fold, so there's no flash, no-JS readers see everything,
// and a reload part-way down the page doesn't replay it. Reduced motion: never armed.
export function Reveal({ children, className }: { children: ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    if (el.getBoundingClientRect().top < window.innerHeight * 0.85) return;
    el.dataset.reveal = "armed";
    const io = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        el.dataset.reveal = "shown";
        io.disconnect();
      },
      { rootMargin: "0px 0px -18% 0px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <div ref={ref} className={className}>
      {children}
    </div>
  );
}
