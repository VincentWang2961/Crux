"use client";

import { useEffect, useRef, useState } from "react";
import type { TocItem } from "@/lib/posts";
import { cn } from "@/lib/utils";

// Sticky contents list for lg screens. The section currently being read is highlighted
// and a thin indicator glides to it; clicking scrolls smoothly (html has scroll-smooth).
export function PostToc({ items, title = "contents" }: { items: TocItem[]; title?: string }) {
  const [active, setActive] = useState(items[0]?.id);
  const [bar, setBar] = useState<{ top: number; height: number } | null>(null);
  const list = useRef<HTMLOListElement>(null);

  // Scroll-spy: the active section is the last heading above 30% of the viewport.
  useEffect(() => {
    const headings = items
      .map((i) => document.getElementById(i.id))
      .filter((h): h is HTMLElement => Boolean(h));
    let frame = 0;
    const update = () => {
      frame = 0;
      const line = window.innerHeight * 0.3;
      let current = headings[0]?.id;
      for (const h of headings) if (h.getBoundingClientRect().top <= line) current = h.id;
      // At the very bottom, the last section wins even if its heading never reaches the line.
      if (window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 4) {
        current = headings[headings.length - 1]?.id;
      }
      setActive(current);
    };
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      cancelAnimationFrame(frame);
    };
  }, [items]);

  // Move the indicator to the active link.
  useEffect(() => {
    const link = list.current?.querySelector<HTMLElement>(`[data-id="${active}"]`);
    if (link) setBar({ top: link.offsetTop, height: link.offsetHeight });
  }, [active]);

  return (
    <nav aria-labelledby="toc-title" className="sticky top-10 font-mono text-xs">
      <p id="toc-title" className="mb-3 text-muted-foreground">
        {title}
      </p>
      <ol ref={list} className="relative flex flex-col border-l">
        {bar && (
          <span
            aria-hidden
            style={{ transform: `translateY(${bar.top}px)`, height: bar.height }}
            className="absolute top-0 -left-px w-px bg-foreground transition-[transform,height] duration-300 ease-[cubic-bezier(0.2,0.8,0.2,1)] motion-reduce:transition-none"
          />
        )}
        {items.map((item) => (
          <li key={item.id}>
            <a
              href={`#${item.id}`}
              data-id={item.id}
              aria-current={active === item.id ? "location" : undefined}
              className={cn(
                "block py-1.5 leading-snug transition-colors duration-200 hover:text-foreground",
                item.depth === 3 ? "pl-6" : "pl-3",
                active === item.id ? "text-foreground" : "text-muted-foreground",
              )}
            >
              {item.text}
            </a>
          </li>
        ))}
      </ol>
    </nav>
  );
}
