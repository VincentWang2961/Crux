"use client";

import {
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent,
  type MouseEvent,
  type SyntheticEvent,
} from "react";
import { flushSync } from "react-dom";
import Image from "next/image";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import type { Photo } from "@/lib/site-data";

// Loose prints laid out like photos spread on a table.
// - md and up: prints are absolutely positioned across the width. Each one is slightly
//   rotated and offset, and neighbours overlap. Hovering or focusing a print lifts it
//   to the top, straightens it and scales it up.
// - Phones (no hover): a horizontal swipe strip of the same overlapping, tilted prints.
// - Clicking or tapping a print opens it in a <dialog> lightbox that fills most of the
//   screen. The rest of the page is blurred behind it (::backdrop).
//   Esc, the close button, or clicking outside closes it; ←/→ steps between photos.
// - Open/close transition (FLIP, Web Animations API): the print "lifts off" the table.
//   The lightbox image starts exactly over the clicked print (same position, size and
//   tilt) and flies to the centre while straightening, as the blurred backdrop fades in.
//   The caption and close button follow shortly after. Closing reverses it: the photo
//   flies back into its slot (the current one, if you stepped with ←/→). The print in
//   the spread is hidden while its photo is open, so it looks like the same object.
//   With reduced motion it opens and closes instantly.

// Long edge of a print; the short edge follows the photo's own aspect ratio.
const LONG_EDGE_REM = 13;
// Deterministic "messy" placement, cycled per print (rotation in deg, vertical offset in rem).
const TILT = [-6, 4, -3, 7, -5, 3, -7, 5, -2, 6];
const DROP = [2.5, 6, 1, 5, 3, 7, 1.5, 4.5, 2, 5.5];

// Transition timing.
const OPEN_MS = 480;
const CLOSE_MS = 360;
const EASE_OUT = "cubic-bezier(0.2, 0.8, 0.2, 1)"; // fast start, soft landing (same curve as the hero)
const EASE_IN_OUT = "cubic-bezier(0.4, 0, 0.2, 1)";

const reducedMotion = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;

// Transform that puts `el` (laid out at its final place) exactly over `from`, including
// the print's current rotation and hover scale. Both share the photo's aspect ratio, so a
// uniform scale is enough.
function transformFrom(from: HTMLElement, el: HTMLElement) {
  const a = from.getBoundingClientRect(); // axis-aligned box, centre is exact even when rotated
  const b = el.getBoundingClientRect();
  const cs = getComputedStyle(from);
  const rotate = cs.rotate === "none" ? "0deg" : cs.rotate;
  const scale = cs.scale === "none" ? 1 : parseFloat(cs.scale);
  const s = (from.offsetWidth * scale) / b.width;
  const dx = a.left + a.width / 2 - (b.left + b.width / 2);
  const dy = a.top + a.height / 2 - (b.top + b.height / 2);
  return `translate(${dx}px, ${dy}px) scale(${s}) rotate(${rotate})`;
}

// Wait until the large image can paint (or give up quickly and animate anyway).
function ready(img: HTMLImageElement) {
  return Promise.race([img.decode().catch(() => {}), new Promise((r) => setTimeout(r, 300))]);
}

export function PhotoSpread({ photos }: { photos: Photo[] }) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const thumbRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const activeRef = useRef<number | null>(null);
  const closingRef = useRef(false);
  const [active, setActive] = useState<number | null>(null);
  const n = photos.length;

  const lightboxImg = () =>
    dialogRef.current?.querySelector<HTMLImageElement>("[data-lightbox-img]") ?? null;
  const chrome = () =>
    Array.from(dialogRef.current?.querySelectorAll<HTMLElement>("[data-lightbox-chrome]") ?? []);
  const showThumb = (i: number | null, visible: boolean) => {
    const t = i === null ? null : thumbRefs.current[i];
    if (t) t.style.visibility = visible ? "" : "hidden";
  };

  function select(i: number | null) {
    activeRef.current = i;
    flushSync(() => setActive(i));
  }

  async function open(i: number) {
    const dialog = dialogRef.current;
    const thumb = thumbRefs.current[i];
    if (!dialog || !thumb || dialog.open) return;
    closingRef.current = false;
    select(i);
    dialog.showModal();
    const img = lightboxImg();
    if (!img || reducedMotion()) return;

    // Park the image over the print and keep everything else invisible until it can paint.
    const from = transformFrom(thumb, img);
    img.style.transform = from;
    const hidden = chrome();
    hidden.forEach((el) => (el.style.opacity = "0"));
    dialog.style.setProperty("--backdrop-o", "0");
    await ready(img);
    img.style.transform = "";
    hidden.forEach((el) => (el.style.opacity = ""));
    dialog.style.removeProperty("--backdrop-o");
    if (closingRef.current || activeRef.current !== i) return;

    showThumb(i, false);
    img.animate([{ transform: from, boxShadow: "0 4px 6px rgb(0 0 0 / 0.1)" }, { transform: "none" }], {
      duration: OPEN_MS,
      easing: EASE_OUT,
    });
    dialog.animate({ opacity: [0, 1] }, { duration: OPEN_MS * 0.7, easing: "ease-out", pseudoElement: "::backdrop" });
    hidden.forEach((el) =>
      el.animate({ opacity: [0, 1], transform: ["translateY(6px)", "none"] }, {
        duration: 220,
        delay: OPEN_MS * 0.55,
        easing: "ease-out",
        fill: "backwards",
      }),
    );
  }

  async function close() {
    const dialog = dialogRef.current;
    if (!dialog?.open || closingRef.current) return;
    closingRef.current = true;
    const i = activeRef.current;
    const thumb = i === null ? null : thumbRefs.current[i];
    const img = lightboxImg();

    if (thumb && img && !reducedMotion()) {
      dialog.getAnimations({ subtree: true }).forEach((a) => a.finish());
      const to = transformFrom(thumb, img);
      const opts = { duration: CLOSE_MS, easing: EASE_IN_OUT, fill: "forwards" } as const;
      const fly = img.animate([{ transform: "none" }, { transform: to }], opts);
      dialog.animate({ opacity: [1, 0] }, { ...opts, pseudoElement: "::backdrop" });
      chrome().forEach((el) => el.animate({ opacity: [1, 0] }, { ...opts, duration: 120 }));
      await fly.finished.catch(() => {});
    }
    dialog.close();
    onClosed(); // don't wait for the async "close" event; onClosed is idempotent
  }

  // Restores the print and clears state. Runs after our animated close and also on any
  // native close (the "close" event), so it must be safe to call twice.
  function onClosed() {
    dialogRef.current?.getAnimations({ subtree: true }).forEach((a) => a.cancel());
    showThumb(activeRef.current, true);
    closingRef.current = false;
    if (activeRef.current !== null) select(null);
  }

  function step(d: number) {
    const i = activeRef.current;
    if (i === null || closingRef.current) return;
    const next = (i + d + n) % n;
    showThumb(i, true);
    showThumb(next, false);
    select(next);
    if (reducedMotion()) return;
    lightboxImg()?.animate(
      { opacity: [0, 1], transform: [`translateX(${d * 28}px)`, "none"] },
      { duration: 240, easing: EASE_OUT },
    );
  }

  function onKeyDown(e: KeyboardEvent<HTMLDialogElement>) {
    if (e.key === "ArrowRight") step(1);
    if (e.key === "ArrowLeft") step(-1);
  }
  // Esc: run the animated close instead of the instant native one.
  function onCancel(e: SyntheticEvent<HTMLDialogElement>) {
    e.preventDefault();
    close();
  }
  // A click that lands on the <dialog> itself (not its content) is a backdrop click.
  function onDialogClick(e: MouseEvent<HTMLDialogElement>) {
    if (e.target === e.currentTarget) close();
  }

  const current = active === null ? null : photos[active];

  return (
    <>
      <ul className="-mx-[max(1.25rem,env(safe-area-inset-left))] flex snap-x snap-mandatory items-start overflow-x-auto px-[max(1.25rem,env(safe-area-inset-left))] pt-4 pb-12 [scrollbar-width:none] md:relative md:mx-0 md:block md:h-[24rem] md:overflow-visible md:p-0">
        {photos.map((p, i) => {
          const ratio = p.width / p.height;
          const w = ratio >= 1 ? LONG_EDGE_REM : LONG_EDGE_REM * ratio;
          const style = {
            "--w": `${w}rem`,
            "--t": n > 1 ? i / (n - 1) : 0.5,
            "--y": `${DROP[i % DROP.length]}rem`,
            "--r": `${TILT[i % TILT.length]}deg`,
            "--z": i + 1,
          } as CSSProperties;
          return (
            <li
              key={p.src}
              style={style}
              className="relative z-(--z) w-(--w) shrink-0 snap-center not-first:-ml-12 has-[button:hover]:z-50 has-[button:focus-visible]:z-50 max-md:mt-[calc(var(--y)*0.5)] max-md:max-w-[62vw] md:absolute md:top-(--y) md:left-[calc((100%-var(--w))*var(--t))] md:not-first:ml-0"
            >
              <button
                ref={(el) => {
                  thumbRefs.current[i] = el;
                }}
                type="button"
                onClick={() => open(i)}
                aria-label={`Open photo: ${p.place}`}
                className="block w-full cursor-zoom-in rotate-(--r) rounded-[3px] bg-white p-1.5 shadow-md ring-1 ring-black/5 transition-[rotate,scale,box-shadow] duration-300 ease-out outline-none hover:scale-110 hover:rotate-0 hover:shadow-2xl focus-visible:scale-110 focus-visible:rotate-0 focus-visible:shadow-2xl focus-visible:ring-2 focus-visible:ring-ring active:scale-105 motion-reduce:transition-none dark:bg-neutral-200"
              >
                <Image
                  src={p.src}
                  alt={p.alt}
                  width={p.width}
                  height={p.height}
                  sizes={`${LONG_EDGE_REM}rem`}
                  draggable={false}
                  className="block h-auto w-full rounded-[2px] select-none"
                />
              </button>
            </li>
          );
        })}
      </ul>

      <dialog
        ref={dialogRef}
        onClose={onClosed}
        onCancel={onCancel}
        onKeyDown={onKeyDown}
        onClick={onDialogClick}
        aria-label={current ? current.place : "Photo"}
        className="m-auto max-h-none max-w-none overflow-visible bg-transparent p-0 backdrop:bg-black/30 backdrop:opacity-(--backdrop-o,1) backdrop:backdrop-blur-md"
      >
        {current && (
          // Never transform the <dialog> itself: it would become the containing block for
          // the fixed close button. The transitions animate the image and chrome instead.
          <figure className="flex flex-col items-center gap-3">
            <Image
              data-lightbox-img
              key={current.src}
              src={current.src}
              alt={current.alt}
              width={current.width}
              height={current.height}
              sizes="92vw"
              loading="eager"
              fetchPriority="high"
              // Explicit size from the aspect ratio (fits 92vw × 82svh), so the box is laid
              // out before the file loads and the open transition can measure it.
              style={{
                width: `min(92vw, calc(82svh * ${current.width / current.height}))`,
                aspectRatio: `${current.width} / ${current.height}`,
              }}
              className="box-border h-auto rounded-md bg-white object-contain p-1.5 shadow-2xl"
            />
            <figcaption
              data-lightbox-chrome
              className="flex items-center gap-3 rounded-full bg-background/80 px-2 py-1 font-mono text-xs text-foreground shadow-sm backdrop-blur">
              <button
                type="button"
                onClick={() => step(-1)}
                aria-label="Previous photo"
                className="grid size-8 place-items-center rounded-full hover:bg-muted"
              >
                <ChevronLeft className="size-4" />
              </button>
              <span>
                {current.place}
                {current.date && ` · ${current.date}`}
              </span>
              <span className="text-muted-foreground tabular-nums">
                {active! + 1}/{n}
              </span>
              <button
                type="button"
                onClick={() => step(1)}
                aria-label="Next photo"
                className="grid size-8 place-items-center rounded-full hover:bg-muted"
              >
                <ChevronRight className="size-4" />
              </button>
            </figcaption>
          </figure>
        )}
        <button
          data-lightbox-chrome
          type="button"
          onClick={close}
          aria-label="Close photo"
          className="fixed top-[max(1rem,env(safe-area-inset-top))] right-[max(1rem,env(safe-area-inset-right))] grid size-10 place-items-center rounded-full bg-background/80 text-foreground shadow-sm backdrop-blur hover:bg-background"
        >
          <X className="size-5" />
        </button>
      </dialog>
    </>
  );
}
