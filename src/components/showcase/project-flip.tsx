"use client";

import { useEffect, useRef, type MouseEvent, type ReactNode, type SyntheticEvent } from "react";
import { X } from "lucide-react";

// A project card that turns over into its details.
// - Clicking the card (or Enter / Space on its button) lifts it out of the grid into a
//   native modal <dialog>: it flies to the centre of the screen while rotating 180° about its
//   vertical axis, and its back, the details panel, grows to full size. It rises towards the
//   viewer mid-turn (translateZ), and the page behind blurs in.
// - Closing (Esc, the × button, a click outside) plays it backwards into the card's slot.
// - The card in the grid is hidden while its twin is out, so the two read as one object.
// - Reduced motion: opens and closes instantly.
// The faces are server-rendered and passed in: `front` is the card exactly as the grid shows
// it; `back` is the details. Only the motion lives here.

const OPEN_MS = 760;
const CLOSE_MS = 600;
const EASE = "cubic-bezier(0.65, 0, 0.35, 1)"; // ease-in-out: a turn starts and lands gently
const LIFT = "120px"; // how far the card rises towards the viewer at mid-turn
const PANEL_MAX_W = 640; // px
const GUTTER = 16; // px, minimum space around the panel
const PANEL_MAX_H = 0.86; // share of the viewport height

type Props = { title: string; front: ReactNode; back: ReactNode };

const box = (r: { left: number; top: number; width: number; height: number }) => ({
  left: `${r.left}px`,
  top: `${r.top}px`,
  width: `${r.width}px`,
  height: `${r.height}px`,
});

export function ProjectFlip({ title, front, back }: Props) {
  const slot = useRef<HTMLDivElement>(null);
  const opener = useRef<HTMLButtonElement>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  const flipper = useRef<HTMLDivElement>(null);
  const frontFace = useRef<HTMLDivElement>(null);
  const backInner = useRef<HTMLDivElement>(null);
  const motion = useRef<Animation | null>(null);
  const closing = useRef(false);

  const reduced = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  // Where the open panel sits: centred, up to PANEL_MAX_W wide, as tall as its content.
  const panelRect = () => {
    const width = Math.min(PANEL_MAX_W, window.innerWidth - GUTTER * 2);
    const inner = backInner.current!;
    inner.style.width = `${width}px`;
    const height = Math.min(inner.scrollHeight, window.innerHeight * PANEL_MAX_H);
    return { left: (window.innerWidth - width) / 2, top: (window.innerHeight - height) / 2, width, height };
  };

  const open = () => {
    const d = dialog.current;
    const f = flipper.current;
    const s = slot.current;
    if (!d || !f || !s || d.open) return;
    const from = s.getBoundingClientRect();
    // The front face keeps the card's exact size the whole way, so nothing reflows.
    frontFace.current!.style.width = `${from.width}px`;
    frontFace.current!.style.height = `${from.height}px`;
    d.showModal();
    const to = panelRect();
    Object.assign(f.style, box(to), { transform: "rotateY(180deg)" });
    s.style.visibility = "hidden";
    if (reduced()) return;
    motion.current = f.animate(
      [
        { ...box(from), transform: "rotateY(0deg) translateZ(0)" },
        { offset: 0.5, transform: `rotateY(90deg) translateZ(${LIFT})` },
        { ...box(to), transform: "rotateY(180deg) translateZ(0)" },
      ],
      { duration: OPEN_MS, easing: EASE },
    );
    d.animate({ opacity: [0, 1] }, { duration: OPEN_MS * 0.6, easing: "ease-out", pseudoElement: "::backdrop" });
  };

  const close = () => {
    const d = dialog.current;
    const f = flipper.current;
    const s = slot.current;
    if (!d || !f || !s || !d.open || closing.current) return;
    const finish = () => {
      // Show the card again first: focus can only return to a visible button.
      s.style.visibility = "";
      d.close();
      opener.current?.focus({ preventScroll: true });
      motion.current?.cancel();
      motion.current = null;
      closing.current = false;
    };
    if (reduced()) return finish();
    closing.current = true;
    motion.current?.cancel();
    const from = f.getBoundingClientRect();
    const at = { left: from.left, top: from.top, width: f.offsetWidth, height: f.offsetHeight };
    const to = s.getBoundingClientRect();
    motion.current = f.animate(
      [
        { ...box(at), transform: "rotateY(180deg) translateZ(0)" },
        { offset: 0.5, transform: `rotateY(90deg) translateZ(${LIFT})` },
        { ...box(to), transform: "rotateY(0deg) translateZ(0)" },
      ],
      { duration: CLOSE_MS, easing: EASE, fill: "forwards" },
    );
    d.animate({ opacity: [1, 0] }, { duration: CLOSE_MS, easing: "ease-in", fill: "forwards", pseudoElement: "::backdrop" });
    motion.current.onfinish = finish;
  };

  // Keep the open panel centred and sized when the window changes.
  useEffect(() => {
    const onResize = () => {
      const d = dialog.current;
      const f = flipper.current;
      if (!d?.open || !f || closing.current) return;
      motion.current?.finish();
      Object.assign(f.style, box(panelRect()));
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
        className="m-0 h-full max-h-none w-full max-w-none overflow-visible bg-transparent p-0 perspective-[1800px] backdrop:bg-black/30 backdrop:backdrop-blur-md"
      >
        <div ref={flipper} className="fixed transform-3d">
          {/* Front: the card itself, centred, at its grid size. */}
          <div aria-hidden className="absolute inset-0 grid place-items-center backface-hidden">
            <div ref={frontFace} className="[&>*]:h-full">
              {front}
            </div>
          </div>
          {/* Back: the details panel, grown to its full size. */}
          <div className="absolute inset-0 overflow-hidden rounded-xl bg-card text-card-foreground shadow-2xl ring-1 ring-foreground/10 backface-hidden rotate-y-180">
            <div ref={backInner} className="max-h-[86svh] overflow-y-auto overscroll-contain">
              {back}
            </div>
            <button
              type="button"
              onClick={close}
              aria-label="Close details"
              className="absolute top-3 right-3 grid size-9 place-items-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
            >
              <X className="size-4" />
            </button>
          </div>
        </div>
      </dialog>
    </>
  );
}
