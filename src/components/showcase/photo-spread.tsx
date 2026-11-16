"use client";

import {
  useEffect,
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
import { cn } from "@/lib/utils";
import { layoutSpread, type SpreadLayout } from "@/lib/photo-layout";

// Loose prints laid out like photos spread on a table.
// - Layout (src/lib/photo-layout.ts): the prints fill the full width of the page and wrap
//   onto more rows when they don't fit, with a fresh random arrangement (order, jitter,
//   tilt) on every visit; at least 40% of every print is never covered by another. The
//   layout is computed on the client from the measured width (ResizeObserver) and reflows
//   smoothly on resize with the same seed. Before that (server HTML, no JS) the prints sit
//   in a plain centred wrap.
// - Entrance: the first time the spread scrolls into view the prints are dealt onto the
//   table one by one, flying out from a pile in the middle with an expo-out ease.
// - Hovering or focusing a print lifts it to the top, straightens it and scales it up.
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

// Entrance ("dealing" the prints): duration, stagger between prints, and how far from
// the pile in the middle each print starts (share of the distance to its place).
const DEAL_MS = 1000;
const DEAL_STAGGER_MS = 70;
const DEAL_FROM = 0.55;
const DEAL_EASE = "cubic-bezier(0.16, 1, 0.3, 1)";

// White print border (px), the same thickness on the print and in the lightbox. In the
// lightbox it is a box-shadow ring around the photo (outside the box, so it never affects
// layout). During the transition its thickness and the corner radius are counter-scaled
// (÷ scale), so on screen the border is always BORDER_PX and matches the print at both
// ends of the flight.
const BORDER_PX = 6;
const PHOTO_RADIUS_PX = 2; // photo corners (print and lightbox)
const LIGHTBOX_SHADOW = "0 25px 50px -6px rgb(0 0 0 / 0.3), 0 0 0 0 rgb(0 0 0 / 0)";

// Swipe in the lightbox: distance (px) or flick speed (px/ms) that changes photo.
const SWIPE_DISTANCE = 60;
const SWIPE_VELOCITY = 0.4;

// Transition timing.
const OPEN_MS = 480;
const CLOSE_MS = 360;
const EASE_OUT = "cubic-bezier(0.2, 0.8, 0.2, 1)"; // fast start, soft landing (same curve as the hero)
const EASE_IN_OUT = "cubic-bezier(0.4, 0, 0.2, 1)";

const reducedMotion = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;

// Lightbox frame styles (shadow + radius) for a given on-screen scale `s`. The border ring
// and the photo radius are divided by `s` so that, after the scale transform, they are
// exactly BORDER_PX / PHOTO_RADIUS_PX on screen. `print` = the print's resting shadow
// (shadow-md, also counter-scaled, with a spread so it starts outside the border).
function frameStyle(s: number, ring: string, print: boolean) {
  const px = (v: number) => `${v / s}px`;
  const drop = print
    ? `0 ${px(4)} ${px(6)} ${px(BORDER_PX - 1)} rgb(0 0 0 / 0.1), 0 ${px(2)} ${px(4)} ${px(BORDER_PX - 2)} rgb(0 0 0 / 0.1)`
    : LIGHTBOX_SHADOW;
  return { boxShadow: `0 0 0 ${px(BORDER_PX)} ${ring}, ${drop}`, borderRadius: px(PHOTO_RADIUS_PX) };
}

// Keyframe that puts the lightbox photo `frame` (laid out at its final place, untransformed)
// exactly over the print's photo, including the print's tilt and hover scale. Photo is
// mapped onto photo (both have the photo's exact aspect ratio), so a uniform scale is exact.
function keyframeAtPrint(print: HTMLElement, frame: HTMLElement) {
  const photo = print.querySelector("img") ?? print;
  const a = photo.getBoundingClientRect(); // axis-aligned box: its centre is exact even when tilted
  const b = frame.getBoundingClientRect();
  const cs = getComputedStyle(print);
  const rotate = cs.rotate === "none" ? "0deg" : cs.rotate;
  const scale = cs.scale === "none" ? 1 : parseFloat(cs.scale);
  // Unrounded layout widths (offsetWidth rounds to whole px, which shows as a tiny jump).
  const s = (parseFloat(getComputedStyle(photo).width) * scale) / parseFloat(getComputedStyle(frame).width);
  const dx = a.left + a.width / 2 - (b.left + b.width / 2);
  const dy = a.top + a.height / 2 - (b.top + b.height / 2);
  return {
    transform: `translate(${dx}px, ${dy}px) scale(${s}) rotate(${rotate})`,
    ...frameStyle(s, cs.backgroundColor, true),
  };
}
const keyframeAtRest = (print: HTMLElement) => ({
  transform: "none",
  ...frameStyle(1, getComputedStyle(print).backgroundColor, false),
});

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

// Deal the prints onto the table: each flies out from a pile in the middle of the spread
// to its place, in placement order (`data-rank`).
function deal(ul: HTMLUListElement) {
  const box = ul.getBoundingClientRect();
  const pileX = box.left + box.width / 2;
  const pileY = box.top + Math.min(box.height, window.innerHeight) / 2;
  const items = Array.from(ul.children) as HTMLElement[];
  const rank = (el: HTMLElement) => Number(el.dataset.rank ?? 0);
  // Start every animation (fill: backwards) before un-hiding, in the same frame.
  for (const li of items) {
    const r = li.getBoundingClientRect();
    const dx = (pileX - (r.left + r.width / 2)) * DEAL_FROM;
    const dy = (pileY - (r.top + r.height / 2)) * DEAL_FROM + 40;
    const spin = (rank(li) % 2 ? 1 : -1) * 10;
    li.animate(
      [
        { opacity: 0, transform: `translate(${dx}px, ${dy}px) rotate(${spin}deg) scale(0.7)` },
        { opacity: 1, offset: 0.35 },
        { opacity: 1, transform: "none" },
      ],
      { duration: DEAL_MS, delay: rank(li) * DEAL_STAGGER_MS, easing: DEAL_EASE, fill: "backwards" },
    );
  }
  delete ul.dataset.deal;
}

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

  // Layout from the measured width. The seed is picked once per visit, so resizing
  // reflows the same arrangement rather than reshuffling it.
  const listRef = useRef<HTMLUListElement>(null);
  const seedRef = useRef<number | null>(null);
  const [layout, setLayout] = useState<SpreadLayout | null>(null);
  // Animate position changes only on reflows (resize), not on the first placement.
  const [reflow, setReflow] = useState(false);
  useEffect(() => {
    const el = listRef.current;
    if (!el) return;
    const ratios = photos.map((p) => p.width / p.height);
    let width = 0;
    // ResizeObserver already reports at most once per frame, so lay out right here.
    const ro = new ResizeObserver(([entry]) => {
      const w = Math.round(entry.contentRect.width);
      if (w === width || w === 0) return;
      width = w;
      const first = seedRef.current === null;
      if (first) seedRef.current = Math.floor(Math.random() * 2 ** 32);
      const next = layoutSpread(ratios, w, seedRef.current!);
      setLayout(next);
      setReflow(!first);
      if (first) setOrder(next.order); // placement order = initial stacking order
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [photos]);

  // Entrance: once laid out, hide the prints until the spread reaches the viewport, then
  // deal them onto the table in placement order. Plays once per visit; reduced motion and
  // browsers without IntersectionObserver just show them.
  const dealtRef = useRef(false);
  const hasLayout = layout !== null;
  useEffect(() => {
    const ul = listRef.current;
    if (!hasLayout || !ul || dealtRef.current) return;
    if (reducedMotion() || !("IntersectionObserver" in window)) {
      dealtRef.current = true;
      return;
    }
    ul.dataset.deal = "pending";
    const io = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        io.disconnect();
        dealtRef.current = true;
        deal(ul);
      },
      { threshold: 0.15 },
    );
    io.observe(ul);
    return () => io.disconnect();
  }, [hasLayout]);


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
    const from = keyframeAtPrint(thumb, img);
    img.style.transform = from.transform;
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
    img.animate([from, keyframeAtRest(thumb)], {
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
      const to = keyframeAtPrint(thumb, img);
      const opts = { duration: CLOSE_MS, easing: EASE_IN_OUT, fill: "forwards" } as const;
      const fly = img.animate(
        [keyframeAtRest(thumb), to],
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
      <ul
        ref={listRef}
        aria-label="Photos"
        style={layout ? { height: layout.height } : undefined}
        className={
          layout
            ? cn("relative data-[deal=pending]:*:opacity-0", reflow && "transition-[height] duration-500 ease-out")
            : "flex flex-wrap justify-center gap-4 py-4"
        }
      >
        {photos.map((p, i) => {
          const b = layout?.boxes[i];
          const style = b
            ? ({ left: b.x, top: b.y, width: b.w, "--r": `${b.r}deg`, "--z": order.indexOf(i) + 1 } as CSSProperties)
            : ({ width: "12rem", "--r": "0deg" } as CSSProperties);
          return (
            <li
              key={p.src}
              data-rank={layout ? layout.order.indexOf(i) : undefined}
              style={style}
              className={
                b
                  ? cn(
                      "absolute z-(--z) has-[button:hover]:z-50 has-[button:focus-visible]:z-50",
                      reflow &&
                        "transition-[left,top,width] duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] motion-reduce:transition-none",
                    )
                  : "max-w-[42vw]"
              }
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
                className="block w-full cursor-zoom-in rotate-(--r) rounded-[3px] bg-white p-1.5 shadow-md ring-1 ring-black/5 transition-[rotate,scale,box-shadow] duration-300 ease-out outline-none hover:scale-110 hover:rotate-0 hover:shadow-2xl focus-visible:scale-110 focus-visible:rotate-0 focus-visible:shadow-2xl focus-visible:ring-2 focus-visible:ring-ring active:scale-105 motion-reduce:transition-none dark:bg-neutral-200"
              >
                <Image
                  src={p.src}
                  alt={p.alt}
                  width={p.width}
                  height={p.height}
                  sizes={layout ? `${Math.ceil(layout.longEdge)}px` : "12rem"}
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
          <figure className="flex flex-col items-center gap-5">
            <div
              data-lightbox-img
              key={current.src}
              // The photo box itself: explicit size from the aspect ratio (fits 92vw × 82svh,
              // minus the border ring), so it is laid out before any file loads and the
              // transition can measure it. The white border is the first box-shadow layer.
              style={{
                width: `calc(min(92vw, calc(82svh * ${current.width / current.height})) - ${2 * BORDER_PX}px)`,
                aspectRatio: `${current.width} / ${current.height}`,
                borderRadius: PHOTO_RADIUS_PX,
                boxShadow: `0 0 0 ${BORDER_PX}px var(--print), ${LIGHTBOX_SHADOW}`,
              }}
              onPointerDown={onSwipeStart}
              onPointerMove={onSwipeMove}
              onPointerUp={onSwipeEnd}
              onPointerCancel={onSwipeEnd}
              className="relative touch-none overflow-hidden bg-white select-none [--print:var(--color-white)] dark:bg-neutral-200 dark:[--print:var(--color-neutral-200)]"
            >
              <div className="pointer-events-none absolute inset-0">
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
