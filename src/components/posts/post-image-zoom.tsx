"use client";

import { useEffect, useRef, useState, type SyntheticEvent } from "react";
import { flushSync } from "react-dom";
import { X } from "lucide-react";

// Click-to-enlarge for images inside a post (the Markdown body is plain HTML, so this
// attaches to it by id). Same approach as the home page photo lightbox:
// - a native <dialog> (showModal), page blurred behind it via ::backdrop;
// - FLIP: the enlarged image starts exactly over the inline one (position, size, corner
//   radius) and flies to the centre; closing flies it back. The inline image is hidden
//   meanwhile so the two read as one object, and the already-loaded URL is reused, so
//   there's no flash;
// - Esc, the close button or a click anywhere closes it; reduced motion = instant.

const OPEN_MS = 420;
const CLOSE_MS = 320;
const EASE = "cubic-bezier(0.2, 0.8, 0.2, 1)";
const RADIUS_PX = 10; // matches .post-prose img (0.6em at 17px)

type Shown = { src: string; alt: string; caption: string; ratio: number };

const reduced = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;

export function PostImageZoom({ targetId }: { targetId: string }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const frame = useRef<HTMLImageElement>(null);
  const source = useRef<HTMLImageElement | null>(null);
  const closing = useRef(false);
  const [shown, setShown] = useState<Shown | null>(null);

  // Transform that puts the frame exactly over the inline image.
  function fromSource(): Keyframe | null {
    const el = source.current;
    const f = frame.current;
    if (!el || !f) return null;
    const a = el.getBoundingClientRect();
    const b = f.getBoundingClientRect();
    const s = a.width / b.width;
    return {
      transform: `translate(${a.left - b.left}px, ${a.top - b.top}px) scale(${s})`,
      borderRadius: `${RADIUS_PX / s}px`,
    };
  }

  function open(img: HTMLImageElement) {
    const d = dialog.current;
    if (!d || d.open) return;
    source.current = img;
    flushSync(() =>
      setShown({
        src: img.currentSrc || img.src,
        alt: img.alt,
        caption: img.closest("figure")?.querySelector("figcaption")?.textContent ?? "",
        ratio: img.naturalWidth && img.naturalHeight ? img.naturalWidth / img.naturalHeight : 16 / 9,
      }),
    );
    d.showModal();
    const from = fromSource();
    img.style.visibility = "hidden";
    if (!from || reduced()) return;
    frame.current!.animate([from, { transform: "none", borderRadius: `${RADIUS_PX}px` }], {
      duration: OPEN_MS,
      easing: EASE,
    });
    d.animate({ opacity: [0, 1] }, { duration: OPEN_MS, easing: EASE, pseudoElement: "::backdrop" });
    d.querySelectorAll("[data-zoom-chrome]").forEach((el) =>
      el.animate({ opacity: [0, 1] }, { duration: 240, delay: OPEN_MS * 0.6, fill: "backwards" }),
    );
  }

  async function close() {
    const d = dialog.current;
    if (!d?.open || closing.current) return;
    closing.current = true;
    const to = fromSource();
    if (to && !reduced()) {
      const fly = frame.current!.animate([{ transform: "none", borderRadius: `${RADIUS_PX}px` }, to], {
        duration: CLOSE_MS,
        easing: EASE,
        fill: "forwards",
      });
      d.animate({ opacity: [1, 0] }, { duration: CLOSE_MS, easing: EASE, fill: "forwards", pseudoElement: "::backdrop" });
      d.querySelectorAll("[data-zoom-chrome]").forEach((el) =>
        el.animate({ opacity: [1, 0] }, { duration: 140, fill: "forwards" }),
      );
      await fly.finished.catch(() => {});
    }
    d.close();
    d.getAnimations({ subtree: true }).forEach((a) => a.cancel());
    if (source.current) {
      source.current.style.visibility = "";
      source.current.focus({ preventScroll: true });
    }
    closing.current = false;
    setShown(null);
  }

  // Make the post's images zoomable: focusable, labelled, click / Enter / Space.
  useEffect(() => {
    const root = document.getElementById(targetId);
    if (!root) return;
    const images = Array.from(root.querySelectorAll<HTMLImageElement>("figure img"));
    for (const img of images) {
      img.tabIndex = 0;
      img.setAttribute("role", "button");
      img.setAttribute("aria-label", `Enlarge image${img.alt ? `: ${img.alt}` : ""}`);
      img.classList.add("zoomable");
    }
    const target = (e: Event) => (e.target as HTMLElement).closest<HTMLImageElement>("figure img.zoomable");
    const onClick = (e: MouseEvent) => {
      const img = target(e);
      if (img) open(img);
    };
    const onKey = (e: KeyboardEvent) => {
      const img = target(e);
      if (img && (e.key === "Enter" || e.key === " ")) {
        e.preventDefault();
        open(img);
      }
    };
    root.addEventListener("click", onClick);
    root.addEventListener("keydown", onKey);
    return () => {
      root.removeEventListener("click", onClick);
      root.removeEventListener("keydown", onKey);
    };
  });

  return (
    <dialog
      ref={dialog}
      aria-label={shown?.alt || "Image"}
      onCancel={(e: SyntheticEvent) => {
        e.preventDefault();
        close();
      }}
      onClick={close}
      className="m-0 h-full max-h-none w-full max-w-none cursor-zoom-out bg-transparent p-0 backdrop:bg-black/40 backdrop:backdrop-blur-md open:flex"
    >
      {shown && (
        <figure className="m-auto flex flex-col items-center gap-4 p-4">
          {/* eslint-disable-next-line @next/next/no-img-element -- reuses the post's already-loaded image URL */}
          <img
            ref={frame}
            src={shown.src}
            alt={shown.alt}
            style={{ width: `min(92vw, calc(82svh * ${shown.ratio}))`, aspectRatio: shown.ratio }}
            className="origin-top-left rounded-[10px] border bg-background object-contain shadow-2xl"
          />
          {shown.caption && (
            <figcaption data-zoom-chrome className="max-w-prose text-center font-mono text-xs text-white/85">
              {shown.caption}
            </figcaption>
          )}
        </figure>
      )}
      <button
        type="button"
        data-zoom-chrome
        aria-label="Close"
        onClick={(e) => {
          e.stopPropagation();
          close();
        }}
        className="fixed top-[max(1rem,env(safe-area-inset-top))] right-[max(1rem,env(safe-area-inset-right))] flex size-10 items-center justify-center rounded-full bg-black/40 text-white backdrop-blur transition-colors hover:bg-black/60"
      >
        <X aria-hidden className="size-5" />
      </button>
    </dialog>
  );
}
