"use client";

import { useEffect, useRef, type MouseEvent, type ReactNode, type SyntheticEvent } from "react";
import { X } from "lucide-react";

// A project card that turns over, as a solid object, into its details.
// - Clicking the card (or Enter / Space on its button) lifts it out of the grid into a native
//   modal <dialog>. It flies to the centre of the screen while turning 180° about its
//   vertical axis, rising towards the viewer and tipping back slightly mid-turn, and grows
//   into the details panel (its back). The page behind blurs in.
// - It reads as a real card, not a flat sheet:
//   - thickness: EDGE_LAYERS slices stacked between the faces show a solid edge when the
//     card is side-on;
//   - light: each face darkens as it turns away from the viewer and brightens as it turns
//     back, and a soft highlight sweeps across it;
//   - shadow: a deeper shadow while it is lifted.
// - Closing (Esc, the × button, a click outside) plays it all backwards into the card's slot.
// - The card in the grid is hidden while its twin is out, so they read as one object.
// - Reduced motion: opens and closes instantly.
// The faces are server-rendered and passed in: `front` is the card exactly as the grid shows
// it; `back` is the details (a ProjectPager). Only the motion lives here.

const OPEN_MS = 900;
const CLOSE_MS = 700;
const EASE = "cubic-bezier(0.65, 0, 0.35, 1)"; // ease-in-out: a turn starts and lands gently
const LIFT = 160; // px the card rises towards the viewer at mid-turn
const TIP = 10; // degrees it tips back (about the horizontal axis) at mid-turn
const THICKNESS = 8; // px between the two faces
const EDGE_LAYERS = 9;
const PANEL_MAX_W = 760; // px
const PANEL_MAX_H = 520; // px
const GUTTER = 16; // px, minimum space around the panel
const SHADE = 0.55; // how dark a face gets when side-on

type Props = { title: string; front: ReactNode; back: ReactNode };
type Rect = { left: number; top: number; width: number; height: number };

const box = (r: Rect) => ({ left: `${r.left}px`, top: `${r.top}px`, width: `${r.width}px`, height: `${r.height}px` });
// One transform shape for every keyframe so the browser interpolates each part on its own.
const pose = (lift: number, tip: number, turn: number) =>
  `translateZ(${lift}px) rotateX(${tip}deg) rotateY(${turn}deg)`;

export function ProjectFlip({ title, front, back }: Props) {
  const slot = useRef<HTMLDivElement>(null);
  const opener = useRef<HTMLButtonElement>(null);
  const closer = useRef<HTMLButtonElement>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  const flipper = useRef<HTMLDivElement>(null);
  const frontCard = useRef<HTMLDivElement>(null);
  const running = useRef<Animation[]>([]);
  const closing = useRef(false);

  const reduced = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const q = (sel: string) => flipper.current!.querySelector<HTMLElement>(sel)!;

  // Stop every animation this component started, including the backdrop's. A finished
  // animation with `fill: "forwards"` keeps applying its last frame until cancelled: left on
  // the ::backdrop, it would hide the blur on every later open.
  const stop = () => {
    running.current.forEach((a) => a.cancel());
    running.current = [];
  };
  const play = (el: Element, keyframes: Keyframe[], opts: KeyframeAnimationOptions) => {
    const a = el.animate(keyframes, opts);
    running.current.push(a);
    return a;
  };

  // Where the open panel sits: centred, a fixed card shape that fits the screen.
  const panelRect = (): Rect => {
    const width = Math.min(PANEL_MAX_W, window.innerWidth - GUTTER * 2);
    // Phones stack the photo above the text, so there the panel may use most of the screen.
    const maxH = window.innerWidth < 640 ? Infinity : PANEL_MAX_H;
    const height = Math.min(maxH, window.innerHeight * 0.86);
    return { left: (window.innerWidth - width) / 2, top: (window.innerHeight - height) / 2, width, height };
  };

  // The turn itself, from `a` to `b`: flight, thickness, light and shadow move together.
  const turn = (a: Rect, b: Rect, opening: boolean, duration: number) => {
    const opts = { duration, easing: EASE, fill: "forwards" as const };
    const [t0, t1] = opening ? [0, 180] : [180, 0];
    const fly = play(
      flipper.current!,
      [
        { ...box(a), transform: pose(0, 0, t0) },
        { offset: 0.5, transform: pose(LIFT, TIP, 90) },
        { ...box(b), transform: pose(0, 0, t1) },
      ],
      opts,
    );
    // Light: the face turning away darkens towards side-on; the one turning in brightens.
    const away = opening ? "[data-face=front]" : "[data-face=back]";
    const toward = opening ? "[data-face=back]" : "[data-face=front]";
    play(q(`${away} [data-shade]`), [{ opacity: 0 }, { opacity: SHADE }], { ...opts, duration: duration / 2, easing: "ease-in" });
    play(q(`${toward} [data-shade]`), [{ opacity: SHADE }, { opacity: 0 }], {
      ...opts,
      duration: duration / 2,
      delay: duration / 2,
      easing: "ease-out",
      fill: "both",
    });
    // A highlight sweeps across the face that is coming into view.
    play(q(`${toward} [data-glare]`), [{ opacity: 0, backgroundPosition: "120% 0" }, { opacity: 1, offset: 0.4 }, { opacity: 0, backgroundPosition: "-20% 0" }], {
      ...opts,
      duration: duration * 0.6,
      delay: duration * 0.4,
      fill: "both",
    });
    // Deeper shadow while lifted.
    play(q("[data-shadow]"), [{ opacity: 0.35 }, { opacity: 1, offset: 0.5 }, { opacity: 0.35 }], opts);
    return fly;
  };

  const open = () => {
    const d = dialog.current;
    const f = flipper.current;
    const s = slot.current;
    if (!d || !f || !s || d.open) return;
    stop();
    const from = s.getBoundingClientRect();
    // The front keeps the card's exact size the whole way, so nothing reflows.
    frontCard.current!.style.width = `${from.width}px`;
    frontCard.current!.style.height = `${from.height}px`;
    d.showModal();
    closer.current?.focus({ preventScroll: true }); // keys (Esc, ←/→) land in the dialog
    const to = panelRect();
    Object.assign(f.style, box(to), { transform: pose(0, 0, 180) });
    s.style.visibility = "hidden";
    if (reduced()) return;
    turn(from, to, true, OPEN_MS);
    play(d, [{ opacity: 0 }, { opacity: 1 }], { duration: OPEN_MS * 0.6, easing: "ease-out", pseudoElement: "::backdrop" });
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
      stop();
      closing.current = false;
      opener.current?.focus({ preventScroll: true });
    };
    if (reduced()) return finish();
    closing.current = true;
    stop();
    const at = { ...panelRect(), left: parseFloat(f.style.left), top: parseFloat(f.style.top) };
    const fly = turn(at, s.getBoundingClientRect(), false, CLOSE_MS);
    play(d, [{ opacity: 1 }, { opacity: 0 }], { duration: CLOSE_MS, easing: "ease-in", fill: "forwards", pseudoElement: "::backdrop" });
    fly.onfinish = finish;
  };

  // Keep the open panel centred and sized when the window changes.
  useEffect(() => {
    const onResize = () => {
      const d = dialog.current;
      const f = flipper.current;
      if (!d?.open || !f || closing.current) return;
      running.current.forEach((a) => a.finish());
      Object.assign(f.style, box(panelRect()));
    };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  const onCancel = (e: SyntheticEvent) => {
    e.preventDefault(); // Esc: animate out instead of vanishing
    close();
  };
  // A click that lands on the <dialog> itself (not the card) is a click on the backdrop.
  const onDialogClick = (e: MouseEvent) => e.target === e.currentTarget && close();

  const half = THICKNESS / 2;
  const overlays = (
    <>
      <span data-shade aria-hidden className="pointer-events-none absolute inset-0 rounded-[inherit] bg-black opacity-0" />
      <span
        data-glare
        aria-hidden
        className="pointer-events-none absolute inset-0 rounded-[inherit] bg-[linear-gradient(105deg,transparent_35%,rgb(255_255_255/0.28)_50%,transparent_65%)] bg-size-[250%_100%] opacity-0 mix-blend-soft-light"
      />
    </>
  );

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
        className="m-0 h-full max-h-none w-full max-w-none overflow-visible bg-transparent p-0 perspective-[1400px] backdrop:bg-black/35 backdrop:backdrop-blur-md"
      >
        <div ref={flipper} className="fixed transform-3d">
          {/* Shadow on the "table" under the card; deepens while the card is lifted. */}
          <div
            data-shadow
            aria-hidden
            className="pointer-events-none absolute inset-0 rounded-xl opacity-35 shadow-[0_40px_80px_-20px_rgb(0_0_0/0.6),0_20px_40px_-25px_rgb(0_0_0/0.5)]"
            style={{ transform: `translateZ(-${half + 1}px)` }}
          />
          {/* Thickness: slices between the faces, seen only when the card is side-on. */}
          {Array.from({ length: EDGE_LAYERS }, (_, i) => (
            <div
              key={i}
              aria-hidden
              className="absolute inset-0 rounded-xl bg-muted ring-1 ring-foreground/15"
              style={{ transform: `translateZ(${-half + 1 + (i * (THICKNESS - 2)) / (EDGE_LAYERS - 1)}px)` }}
            />
          ))}
          {/* Front: the card as the grid shows it, centred on a face that grows with the flight. */}
          <div
            data-face="front"
            aria-hidden
            className="absolute inset-0 grid place-items-center overflow-hidden rounded-xl bg-card ring-1 ring-foreground/10 backface-hidden"
            style={{ transform: `translateZ(${half}px)` }}
          >
            <div ref={frontCard} className="*:h-full **:data-[slot=card]:bg-transparent **:data-[slot=card]:ring-0">
              {front}
            </div>
            {overlays}
          </div>
          {/* Back: the details. */}
          <div
            data-face="back"
            className="absolute inset-0 overflow-hidden rounded-xl bg-card text-card-foreground ring-1 ring-foreground/10 backface-hidden"
            style={{ transform: `rotateY(180deg) translateZ(${half}px)` }}
          >
            {back}
            {overlays}
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
