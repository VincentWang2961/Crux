"use client";

import {
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent,
  type MouseEvent,
  type PointerEvent as ReactPointerEvent,
  type SyntheticEvent,
} from "react";
import { flushSync } from "react-dom";
import Image, { getImageProps } from "next/image";
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

// White print border and corner radius as a fraction of the print's width. The
// thumbnail and the lightbox use the same fractions, so when one is scaled into the
// other during the transition the border matches exactly (no jump at the end).
const BORDER = 0.025;
const RADIUS = 0.014;
const INNER_RADIUS = 0.006;

// Swipe in the lightbox: distance (px) or flick speed (px/ms) that changes photo.
const SWIPE_DISTANCE = 60;
const SWIPE_VELOCITY = 0.4;

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

// No white flash, no waiting on the network: the photo that flies is the print's own
// already-loaded thumbnail (same URL, so it comes straight from the browser cache) used
// as a placeholder. The full-resolution file fades in over it once it has loaded, which
// is usually before the flight even ends, because it is preloaded on hover, focus or
// touch (and the neighbours are preloaded while the lightbox is open).

// The rendered lightbox width is min(92vw, 82svh × ratio). Matching `sizes` makes the
// browser pick the right candidate, and preload and render must use the same string.
const lightboxSizes = (p: Photo) => `min(92vw, ${((82 * p.width) / p.height).toFixed(2)}vh)`;

const preloaded = new Set<string>();
function preload(p: Photo | undefined) {
  if (!p || preloaded.has(p.src)) return;
  preloaded.add(p.src);
  const { props } = getImageProps({
    src: p.src,
    alt: "",
    width: p.width,
    height: p.height,
    sizes: lightboxSizes(p),
  });
  const img = new window.Image();
  img.decoding = "async";
  if (props.sizes) img.sizes = props.sizes;
  if (props.srcSet) img.srcset = props.srcSet;
  img.src = props.src;
  img.decode().catch(() => {});
}

// Fade the full-res image in over the placeholder as soon as its file is available.
function revealWhenLoaded(img: HTMLImageElement | null) {
  if (!img) return;
  const show = () => (img.dataset.loaded = "");
  if (img.complete && img.naturalWidth > 0) show();
  else img.addEventListener("load", show, { once: true });
}

// The placeholder is cached, so this resolves almost at once; the timeout is a safety net.
function ready(img: HTMLImageElement | null | undefined) {
  if (!img) return Promise.resolve();
  return Promise.race([img.decode().catch(() => {}), new Promise((r) => setTimeout(r, 120))]);
}

const printVars = {
  "--border": BORDER,
  "--radius": RADIUS,
  "--inner-radius": INNER_RADIUS,
} as CSSProperties;

export function PhotoSpread({ photos }: { photos: Photo[] }) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const thumbRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const activeRef = useRef<number | null>(null);
  const closingRef = useRef(false);
  const [active, setActive] = useState<number | null>(null);
  // currentSrc of the active print's thumbnail, shown under the full-res image.
  const [placeholder, setPlaceholder] = useState<string | null>(null);
  const n = photos.length;
  // Stacking order of the prints, bottom → top. The last print hovered, focused or opened
  // moves to the top and stays there, like picking a photo up and putting it back on the
  // pile, so a closed photo lands on top instead of sliding under its neighbours.
  const [order, setOrder] = useState(() => photos.map((_, i) => i));
  const raise = (i: number) =>
    setOrder((o) => (o[o.length - 1] === i ? o : [...o.filter((x) => x !== i), i]));
  const swipeRef = useRef<{ id: number; x: number; t: number; dx: number } | null>(null);

  // The white photo frame that flies (wraps the placeholder and the full-res image).
  const lightboxImg = () =>
    dialogRef.current?.querySelector<HTMLElement>("[data-lightbox-img]") ?? null;
  const chrome = () =>
    Array.from(dialogRef.current?.querySelectorAll<HTMLElement>("[data-lightbox-chrome]") ?? []);
  const showThumb = (i: number | null, visible: boolean) => {
    const t = i === null ? null : thumbRefs.current[i];
    if (t) t.style.visibility = visible ? "" : "hidden";
  };

  function select(i: number | null) {
    activeRef.current = i;
    if (i !== null) raise(i);
    const thumbImg = i === null ? null : thumbRefs.current[i]?.querySelector("img");
    flushSync(() => {
      setActive(i);
      setPlaceholder(thumbImg?.currentSrc || null);
    });
    if (i !== null) {
      preload(photos[(i + 1) % n]);
      preload(photos[(i - 1 + n) % n]);
    }
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

    // Park the frame over the print, invisible (the print itself stays on screen), until
    // the cached placeholder can paint. Then swap print for frame and fly.
    const from = transformFrom(thumb, img);
    img.style.transform = from;
    img.style.visibility = "hidden";
    const hidden = chrome();
    hidden.forEach((el) => (el.style.opacity = "0"));
    dialog.style.setProperty("--backdrop-o", "0");
    await ready(img.querySelector<HTMLImageElement>("[data-placeholder]"));
    img.style.transform = "";
    img.style.visibility = "";
    hidden.forEach((el) => (el.style.opacity = ""));
    dialog.style.removeProperty("--backdrop-o");
    if (closingRef.current || activeRef.current !== i) return;

    showThumb(i, false);
    img.animate([{ transform: from, boxShadow: getComputedStyle(thumb).boxShadow }, { transform: "none" }], {
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
      const fly = img.animate(
        [{ transform: "none" }, { transform: to, boxShadow: getComputedStyle(thumb).boxShadow }],
        opts,
      );
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

  function step(d: number, fromOffset = d * 28) {
    const i = activeRef.current;
    if (i === null || closingRef.current) return;
    const next = (i + d + n) % n;
    showThumb(i, true);
    showThumb(next, false);
    select(next);
    if (reducedMotion()) return;
    lightboxImg()?.animate(
      { opacity: [0, 1], transform: [`translateX(${fromOffset}px)`, "none"] },
      { duration: 260, easing: EASE_OUT },
    );
  }

  // Touch / pen / mouse drag on the photo: it follows the finger horizontally; release
  // past SWIPE_DISTANCE (or with a quick flick) to go to the next / previous photo,
  // otherwise it springs back. Swipe left = next, like a photo app.
  function onSwipeStart(e: ReactPointerEvent<HTMLElement>) {
    if (closingRef.current || (e.pointerType === "mouse" && e.button !== 0)) return;
    lightboxImg()?.getAnimations().forEach((a) => a.finish());
    try {
      e.currentTarget.setPointerCapture(e.pointerId); // keep tracking outside the photo
    } catch {}
    swipeRef.current = { id: e.pointerId, x: e.clientX, t: e.timeStamp, dx: 0 };
  }
  function onSwipeMove(e: ReactPointerEvent<HTMLElement>) {
    const sw = swipeRef.current;
    const img = lightboxImg();
    if (!sw || sw.id !== e.pointerId || !img) return;
    sw.dx = e.clientX - sw.x;
    img.style.transform = `translateX(${sw.dx}px) rotate(${sw.dx * 0.01}deg)`;
    img.style.opacity = String(1 - Math.min(Math.abs(sw.dx) / 600, 0.4));
  }
  function onSwipeEnd(e: ReactPointerEvent<HTMLElement>) {
    const sw = swipeRef.current;
    const img = lightboxImg();
    if (!sw || sw.id !== e.pointerId || !img) return;
    swipeRef.current = null;
    const velocity = Math.abs(sw.dx) / Math.max(e.timeStamp - sw.t, 1);
    const current = img.style.transform;
    img.style.transform = "";
    img.style.opacity = "";
    if (Math.abs(sw.dx) > SWIPE_DISTANCE || (Math.abs(sw.dx) > 15 && velocity > SWIPE_VELOCITY)) {
      const d = sw.dx < 0 ? 1 : -1;
      // The next photo slides in from the side the finger came from.
      step(d, d * Math.min(Math.abs(sw.dx) + 40, 160));
    } else if (current && !reducedMotion()) {
      img.animate({ transform: [current, "none"] }, { duration: 220, easing: EASE_OUT });
    }
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
      <ul style={printVars} className="-mx-[max(1.25rem,env(safe-area-inset-left))] flex snap-x snap-mandatory items-start overflow-x-auto px-[max(1.25rem,env(safe-area-inset-left))] pt-4 pb-12 [scrollbar-width:none] md:relative md:mx-0 md:block md:h-[24rem] md:overflow-visible md:p-0">
        {photos.map((p, i) => {
          const ratio = p.width / p.height;
          const w = ratio >= 1 ? LONG_EDGE_REM : LONG_EDGE_REM * ratio;
          const style = {
            "--w": `${w}rem`,
            "--t": n > 1 ? i / (n - 1) : 0.5,
            "--y": `${DROP[i % DROP.length]}rem`,
            "--r": `${TILT[i % TILT.length]}deg`,
            "--z": order.indexOf(i) + 1,
          } as CSSProperties;
          return (
            <li
              key={p.src}
              style={style}
              className="@container relative z-(--z) w-(--w) shrink-0 snap-center not-first:-ml-12 has-[button:hover]:z-50 has-[button:focus-visible]:z-50 max-md:mt-[calc(var(--y)*0.5)] max-md:max-w-[62vw] md:absolute md:top-(--y) md:left-[calc((100%-var(--w))*var(--t))] md:not-first:ml-0"
            >
              <button
                ref={(el) => {
                  thumbRefs.current[i] = el;
                }}
                type="button"
                onClick={() => open(i)}
                onPointerEnter={() => {
                  preload(p);
                  raise(i);
                }}
                onPointerDown={() => preload(p)}
                onFocus={() => {
                  preload(p);
                  raise(i);
                }}
                aria-label={`Open photo: ${p.place}`}
                className="block w-full cursor-zoom-in rotate-(--r) rounded-[calc(100cqw*var(--radius))] bg-white p-[calc(100cqw*var(--border))] shadow-md ring-1 ring-black/5 transition-[rotate,scale,box-shadow] duration-300 ease-out outline-none hover:scale-110 hover:rotate-0 hover:shadow-2xl focus-visible:scale-110 focus-visible:rotate-0 focus-visible:shadow-2xl focus-visible:ring-2 focus-visible:ring-ring active:scale-105 motion-reduce:transition-none dark:bg-neutral-200"
              >
                <Image
                  src={p.src}
                  alt={p.alt}
                  width={p.width}
                  height={p.height}
                  sizes={`${LONG_EDGE_REM}rem`}
                  draggable={false}
                  className="block h-auto w-full rounded-[calc(100cqw*var(--inner-radius))] select-none"
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
        style={printVars}
        className="m-auto max-h-none max-w-none overflow-visible bg-transparent p-0 backdrop:bg-black/30 backdrop:opacity-(--backdrop-o,1) backdrop:backdrop-blur-md"
      >
        {current && (
          // Never transform the <dialog> itself: it would become the containing block for
          // the fixed close button. The transitions animate the image and chrome instead.
          <figure className="flex flex-col items-center gap-3">
            <div
              data-lightbox-img
              key={current.src}
              // Explicit size from the aspect ratio (fits 92vw × 82svh), so the frame is laid
              // out before any file loads and the open transition can measure it.
              style={
                {
                  "--fw": `min(92vw, calc(82svh * ${current.width / current.height}))`,
                  aspectRatio: `${current.width} / ${current.height}`,
                } as CSSProperties
              }
              onPointerDown={onSwipeStart}
              onPointerMove={onSwipeMove}
              onPointerUp={onSwipeEnd}
              onPointerCancel={onSwipeEnd}
              className="box-border w-(--fw) touch-none rounded-[calc(var(--fw)*var(--radius))] bg-white p-[calc(var(--fw)*var(--border))] shadow-2xl select-none dark:bg-neutral-200"
            >
              <div className="pointer-events-none relative size-full overflow-hidden rounded-[calc(var(--fw)*var(--inner-radius))]">
                {placeholder && (
                  // Cached thumbnail (plain <img>: it must reuse the exact URL already loaded).
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    data-placeholder
                    src={placeholder}
                    alt=""
                    aria-hidden
                    decoding="sync"
                    className="absolute inset-0 size-full object-cover"
                  />
                )}
                <Image
                  src={current.src}
                  alt={current.alt}
                  fill
                  sizes={lightboxSizes(current)}
                  loading="eager"
                  fetchPriority="high"
                  // Native load / complete (not next/image's onLoad, which waits for decode()):
                  // a preloaded, cached file is revealed immediately.
                  ref={revealWhenLoaded}
                  className="object-cover opacity-0 transition-opacity duration-300 data-loaded:opacity-100"
                />
              </div>
            </div>
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
