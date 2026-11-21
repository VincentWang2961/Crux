"use client";

import { useEffect, useRef, type MouseEvent, type ReactNode, type SyntheticEvent } from "react";
import { X } from "lucide-react";
import { DUR, EASE, prefersReducedMotion } from "@/lib/motion";

// A project card that opens into its details: a "container transform".
// - Clicking the card (or Enter / Space on its button) opens a native modal <dialog>. One box,
//   with the card's background, border and corners, grows from the card's place in the grid
//   to the centred details panel, while the page behind blurs in.
// - Nothing inside ever reflows: the card's content keeps the card's exact size and the
//   details keep the panel's exact size, both pinned to the box's centre. The card's
//   content fades out early, the details fade (and rise slightly) in late, so the box looks
//   like the card turning into the panel, with no text squeezing or jumping.
// - Closing (Esc, the × button, a click outside) runs it backwards into the card's slot.
// - The card in the grid is hidden while its twin is out, so they read as one object.
// - Reduced motion: opens and closes instantly.
// `front` is the card exactly as the grid shows it; `back` is the details (one page, or a
// ProjectPager). Both are server-rendered; only the motion lives here.

const OPEN_MS = DUR[4];
const CLOSE_MS = DUR[3];
const PANEL_MAX_W = 820; // px
const PANEL_MAX_H = 640; // px
const GUTTER = 16; // px, minimum space around the panel

type Props = { title: string; front: ReactNode; back: ReactNode };
type Rect = { left: number; top: number; width: number; height: number };

const box = (r: Rect) => ({ left: `${r.left}px`, top: `${r.top}px`, width: `${r.width}px`, height: `${r.height}px` });

export function ProjectFlip({ title, front, back }: Props) {
  const slot = useRef<HTMLDivElement>(null);
  const opener = useRef<HTMLButtonElement>(null);
  const closer = useRef<HTMLButtonElement>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  const panel = useRef<HTMLDivElement>(null);
  const frontLayer = useRef<HTMLDivElement>(null);
  const backLayer = useRef<HTMLDivElement>(null);
  const running = useRef<Animation[]>([]);
  const closing = useRef(false);

  const reduced = prefersReducedMotion;

  // Cancel every animation this component started, the backdrop's included. A finished
  // animation with `fill: "forwards"` keeps applying its last frame until cancelled: left on
  // the ::backdrop it would hide the blur on every later open.
  const stop = () => {
    running.current.forEach((a) => a.cancel());
    running.current = [];
  };
  const play = (el: Element, keyframes: Keyframe[], opts: KeyframeAnimationOptions) => {
    const a = el.animate(keyframes, opts);
    running.current.push(a);
    return a;
  };

  // The open panel: centred, up to PANEL_MAX_W wide, as tall as its content (the tallest
  // page, for a pager), within the screen. The details are laid out at that size once, here.
  const panelRect = (): Rect => {
    const b = backLayer.current!;
    const width = Math.min(PANEL_MAX_W, window.innerWidth - GUTTER * 2);
    b.style.width = `${width}px`;
    b.style.height = "auto";
    const pages = b.querySelectorAll<HTMLElement>("[data-page-body]");
    const nav = b.querySelector<HTMLElement>("[data-pager-nav]");
    const natural =
      pages.length > 1
        ? Math.max(...Array.from(pages, (p) => p.scrollHeight)) + (nav?.offsetHeight ?? 0)
        : (b.firstElementChild as HTMLElement).scrollHeight;
    const maxH = Math.min(window.innerWidth < 640 ? Infinity : PANEL_MAX_H, window.innerHeight - GUTTER * 2);
    const height = Math.min(natural, maxH);
    b.style.height = `${height}px`;
    return { left: (window.innerWidth - width) / 2, top: (window.innerHeight - height) / 2, width, height };
  };

  const open = () => {
    const d = dialog.current;
    const p = panel.current;
    const s = slot.current;
    if (!d || !p || !s || d.open) return;
    stop();
    const from = s.getBoundingClientRect();
    // The card's content keeps the card's exact size the whole way.
    frontLayer.current!.style.width = `${from.width}px`;
    frontLayer.current!.style.height = `${from.height}px`;
    frontLayer.current!.style.opacity = "0";
    d.showModal();
    closer.current?.focus({ preventScroll: true }); // Esc and ←/→ land in the dialog
    const to = panelRect();
    Object.assign(p.style, box(to));
    s.style.visibility = "hidden";
    if (reduced()) return;
    const opts = { duration: OPEN_MS, easing: EASE.move, fill: "both" as const };
    play(p, [box(from), box(to)], opts);
    play(frontLayer.current!, [{ opacity: 1 }, { opacity: 0 }], { ...opts, duration: OPEN_MS * 0.3, easing: "linear" });
    play(backLayer.current!, [{ opacity: 0, transform: "translateY(10px)" }, { opacity: 1, transform: "none" }], {
      ...opts,
      duration: OPEN_MS * 0.65,
      delay: OPEN_MS * 0.3,
      easing: EASE.enter,
    });
    play(d, [{ opacity: 0 }, { opacity: 1 }], { duration: OPEN_MS, easing: EASE.move, pseudoElement: "::backdrop" });
  };

  const close = () => {
    const d = dialog.current;
    const p = panel.current;
    const s = slot.current;
    if (!d || !p || !s || !d.open || closing.current) return;
    const finish = () => {
      // Show the card again first: focus can only return to a visible button.
      s.style.visibility = "";
      d.close();
      stop();
      closing.current = false;
      opener.current?.focus({ preventScroll: true });
    };
    if (reduced()) return finish();
    closing.current = true;
    stop();
    const at = p.getBoundingClientRect();
    const to = s.getBoundingClientRect();
    const opts = { duration: CLOSE_MS, easing: EASE.swap, fill: "both" as const };
    const shrink = play(p, [box(at), box(to)], opts);
    play(backLayer.current!, [{ opacity: 1 }, { opacity: 0 }], { ...opts, duration: CLOSE_MS * 0.35, easing: "linear" });
    play(frontLayer.current!, [{ opacity: 0 }, { opacity: 1 }], { ...opts, duration: CLOSE_MS * 0.45, delay: CLOSE_MS * 0.55 });
    play(d, [{ opacity: 1 }, { opacity: 0 }], { ...opts, easing: EASE.exit, pseudoElement: "::backdrop" });
    shrink.onfinish = finish;
  };

  // Keep the open panel centred and sized when the window changes.
  useEffect(() => {
    const onResize = () => {
      const d = dialog.current;
      const p = panel.current;
      if (!d?.open || !p || closing.current) return;
      running.current.forEach((a) => a.finish());
      Object.assign(p.style, box(panelRect()));
    };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  const onCancel = (e: SyntheticEvent) => {
    e.preventDefault(); // Esc: animate out instead of vanishing
    close();
  };
  // A click that lands on the <dialog> itself (not the panel) is a click on the backdrop.
  const onDialogClick = (e: MouseEvent) => e.target === e.currentTarget && close();

  return (
    <>
      <div ref={slot} className="group relative h-full">
        {front}
        {/* Stretched button over the whole card: the card's own markup stays plain. */}
        <button
          ref={opener}
          type="button"
          onClick={open}
          aria-haspopup="dialog"
          aria-label={`Show details: ${title}`}
          className="absolute inset-0 cursor-pointer rounded-xl focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
        />
      </div>

      <dialog
        ref={dialog}
        aria-label={`${title}: details`}
        onCancel={onCancel}
        onClick={onDialogClick}
        className="m-0 h-full max-h-none w-full max-w-none overflow-visible bg-transparent p-0 backdrop:bg-black/35 backdrop:backdrop-blur-md"
      >
        {/* The box that grows: the card's surface, border and corners. */}
        <div ref={panel} className="fixed overflow-hidden rounded-xl bg-card text-card-foreground shadow-2xl ring-1 ring-foreground/10">
          {/* The card's content at the card's size (its own surface comes from the box). */}
          <div
            ref={frontLayer}
            aria-hidden
            className="pointer-events-none absolute top-1/2 left-1/2 -translate-1/2 *:h-full **:data-[slot=card]:bg-transparent **:data-[slot=card]:ring-0"
          >
            {front}
          </div>
          {/* The details at the panel's size. */}
          <div ref={backLayer} className="absolute top-1/2 left-1/2 -translate-1/2">
            {back}
            <button
              ref={closer}
              type="button"
              onClick={close}
              aria-label="Close details"
              className="absolute top-3 right-3 z-10 grid size-9 place-items-center rounded-full bg-card/80 text-muted-foreground backdrop-blur transition-colors hover:bg-muted hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
            >
              <X className="size-4" />
            </button>
          </div>
        </div>
      </dialog>
    </>
  );
}
