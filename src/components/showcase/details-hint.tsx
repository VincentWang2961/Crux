"use client";

import { useLayoutEffect, useRef, useState } from "react";
import { RotateCw } from "lucide-react";
import { cn } from "@/lib/utils";

// A project card's description with the "↻ Details" hint tucked into its bottom-right corner,
// in the space the last line leaves free:
// - room for the icon and the word: both;
// - room for the icon only: just the icon;
// - no room at all: the icon on a line of its own, right-aligned.
// It re-measures whenever the card's width changes. The hint is decorative: the card's button
// already says "Show details".

type Fit = "full" | "icon" | "below";
const GAP = 8; // px kept between the text and the hint

export function DetailsHint({ text, className }: { text: string; className?: string }) {
  const para = useRef<HTMLParagraphElement>(null);
  const full = useRef<HTMLSpanElement>(null);
  const [fit, setFit] = useState<Fit>("icon");

  useLayoutEffect(() => {
    const p = para.current;
    if (!p) return;
    const measure = () => {
      const range = document.createRange();
      range.selectNodeContents(p.firstChild ?? p);
      const lines = range.getClientRects();
      const last = lines[lines.length - 1];
      if (!last) return;
      const free = p.getBoundingClientRect().right - last.right;
      const fullW = full.current?.offsetWidth ?? 72;
      const iconW = 16;
      setFit(free >= fullW + GAP ? "full" : free >= iconW + GAP ? "icon" : "below");
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(p);
    return () => ro.disconnect();
  }, [text]);

  const icon = (
    <RotateCw aria-hidden className="size-3.5 shrink-0 transition-transform duration-500 group-hover:rotate-180" />
  );
  const hint = (
    <span
      aria-hidden
      className={cn(
        "flex items-center gap-1 font-mono text-xs text-muted-foreground transition-colors group-hover:text-foreground",
        // h: one line of the description (text-sm, leading-relaxed), so the hint sits on it.
        fit === "below" ? "mt-1 justify-end" : "absolute right-0 bottom-0 h-[1.422rem]",
      )}
    >
      {icon}
      {fit === "full" && "Details"}
    </span>
  );

  return (
    <div className={cn("relative", className)}>
      <p ref={para}>{text}</p>
      {hint}
      {/* Off-screen copy of the full hint, to measure its width. */}
      <span ref={full} aria-hidden className="invisible absolute flex items-center gap-1 font-mono text-xs">
        <RotateCw className="size-3.5" />
        Details
      </span>
    </div>
  );
}
