"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { MapPin, RotateCw } from "lucide-react";
import type { Portrait } from "@/lib/site-data";

// About portrait as a print that floats in 3D.
// - Tilt (desktop with a mouse only): while the pointer is over the About section, the
//   card turns slightly to face it, up to MAX_TILT degrees, with a soft glare that follows.
//   The motion is smoothed (eased towards the target each frame) so it never jitters, and
//   it settles back flat when the pointer leaves. Touch screens and small screens get a
//   plain, straight photo.
// - Flip (everywhere): clicking, Enter or Space turns the card over to show where and
//   when the photo was taken; again turns it back. Reduced motion: no tilt, instant flip.

const MAX_TILT = 9; // degrees
const EASE = 0.12; // share of the remaining distance covered per frame
const TILT_QUERY = "(hover: hover) and (pointer: fine) and (min-width: 640px) and (prefers-reduced-motion: no-preference)";

const formatTaken = (date: string) =>
  new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" }).format(
    new Date(`${date}T00:00:00Z`),
  );

export function PortraitCard({ portrait }: { portrait: Portrait }) {
  const tilt = useRef<HTMLDivElement>(null);
  const [flipped, setFlipped] = useState(false);

  useEffect(() => {
    const el = tilt.current;
    const area = el?.closest("section");
    if (!el || !area) return;
    const media = window.matchMedia(TILT_QUERY);

    let frame = 0;
    const cur = { x: 0, y: 0, glare: 0 };
    const target = { x: 0, y: 0, glare: 0 };

    const paint = () => {
      cur.x += (target.x - cur.x) * EASE;
      cur.y += (target.y - cur.y) * EASE;
      cur.glare += (target.glare - cur.glare) * EASE;
      el.style.setProperty("--ry", `${(cur.x * MAX_TILT).toFixed(2)}deg`);
      el.style.setProperty("--rx", `${(-cur.y * MAX_TILT).toFixed(2)}deg`);
      el.style.setProperty("--gx", `${(50 + cur.x * 50).toFixed(1)}%`);
      el.style.setProperty("--gy", `${(50 + cur.y * 50).toFixed(1)}%`);
      el.style.setProperty("--glare", cur.glare.toFixed(3));
      const settled =
        Math.abs(target.x - cur.x) < 0.001 && Math.abs(target.y - cur.y) < 0.001 && Math.abs(target.glare - cur.glare) < 0.001;
      frame = settled ? 0 : requestAnimationFrame(paint);
    };
    const kick = () => {
      if (!frame) frame = requestAnimationFrame(paint);
    };

    const onMove = (e: PointerEvent) => {
      if (!media.matches || e.pointerType !== "mouse") return;
      const r = el.getBoundingClientRect();
      // Distance from the card's centre, normalised so the section's edges are about ±1.
      const reach = Math.max(r.width * 2.5, 320);
      const clamp = (v: number) => Math.max(-1, Math.min(1, v));
      target.x = clamp((e.clientX - (r.left + r.width / 2)) / reach);
      target.y = clamp((e.clientY - (r.top + r.height / 2)) / reach);
      target.glare = 1;
      kick();
    };
    const onLeave = () => {
      target.x = target.y = target.glare = 0;
      kick();
    };
    const onMedia = () => !media.matches && onLeave();

    area.addEventListener("pointermove", onMove);
    area.addEventListener("pointerleave", onLeave);
    media.addEventListener("change", onMedia);
    return () => {
      cancelAnimationFrame(frame);
      area.removeEventListener("pointermove", onMove);
      area.removeEventListener("pointerleave", onLeave);
      media.removeEventListener("change", onMedia);
    };
  }, []);

  const face =
    "col-start-1 row-start-1 rounded-[3px] bg-white p-1.5 shadow-md ring-1 ring-black/5 backface-hidden dark:bg-neutral-200";

  return (
    <div className="perspective-[900px]">
      <div
        ref={tilt}
        style={{ transform: "rotateX(var(--rx, 0deg)) rotateY(var(--ry, 0deg))" }}
        className="transform-3d"
      >
        <button
          type="button"
          aria-pressed={flipped}
          aria-label={flipped ? "Show the photo" : "Show where this photo was taken"}
          onClick={() => setFlipped((f) => !f)}
          style={{ transform: `rotateY(${flipped ? 180 : 0}deg)` }}
          className="grid w-full cursor-pointer rounded-[3px] text-left transition-transform duration-700 ease-[cubic-bezier(0.65,0,0.35,1)] transform-3d outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-4 focus-visible:ring-offset-background motion-reduce:transition-none"
        >
          {/* Front: the photo, with a glare that follows the pointer. */}
          <span aria-hidden={flipped} className={face}>
            <span className="relative block aspect-3/4 overflow-hidden rounded-[2px] bg-muted">
              <Image
                src={portrait.src}
                alt={portrait.alt}
                fill
                sizes="(min-width: 768px) 14rem, 11rem"
                style={{ objectPosition: portrait.position ?? "50% 50%" }}
                className="reveal-zoom object-cover"
              />
              <span
                aria-hidden
                style={{
                  opacity: "calc(var(--glare, 0) * 0.35)",
                  background: "radial-gradient(circle at var(--gx, 50%) var(--gy, 50%), rgb(255 255 255 / 0.9), transparent 60%)",
                }}
                className="pointer-events-none absolute inset-0 mix-blend-soft-light"
              />
              {/* A small hint that the photo turns over. */}
              <span className="absolute right-2 bottom-2 flex size-6 items-center justify-center rounded-full bg-black/40 text-white backdrop-blur-sm">
                <RotateCw aria-hidden className="size-3.5" />
              </span>
            </span>
          </span>

          {/* Back: where and when, like a note on the back of a print. */}
          <span aria-hidden={!flipped} className={`${face} rotate-y-180 text-neutral-800`}>
            <span className="flex aspect-3/4 flex-col justify-between rounded-[2px] border border-dashed border-neutral-300 p-4">
              <MapPin aria-hidden className="size-4 text-neutral-500" />
              <span className="flex flex-col gap-1.5">
                {portrait.place?.map((line, i) => (
                  <span key={line} className={i === 0 ? "text-lg leading-snug font-semibold" : "text-sm text-neutral-600"}>
                    {line}
                  </span>
                ))}
                {portrait.taken && (
                  <time dateTime={portrait.taken} className="mt-2 font-mono text-xs text-neutral-500">
                    {formatTaken(portrait.taken)}
                  </time>
                )}
              </span>
            </span>
          </span>
        </button>
      </div>
    </div>
  );
}
