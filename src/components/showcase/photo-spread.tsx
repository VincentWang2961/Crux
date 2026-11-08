"use client";

import { useRef, useState, type CSSProperties, type KeyboardEvent, type MouseEvent } from "react";
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

// Long edge of a print; the short edge follows the photo's own aspect ratio.
const LONG_EDGE_REM = 13;
// Deterministic "messy" placement, cycled per print (rotation in deg, vertical offset in rem).
const TILT = [-6, 4, -3, 7, -5, 3, -7, 5, -2, 6];
const DROP = [2.5, 6, 1, 5, 3, 7, 1.5, 4.5, 2, 5.5];

export function PhotoSpread({ photos }: { photos: Photo[] }) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [active, setActive] = useState<number | null>(null);
  const n = photos.length;

  function open(i: number) {
    setActive(i);
    dialogRef.current?.showModal();
  }
  function step(d: number) {
    setActive((i) => (i === null ? i : (i + d + n) % n));
  }
  function onKeyDown(e: KeyboardEvent<HTMLDialogElement>) {
    if (e.key === "ArrowRight") step(1);
    if (e.key === "ArrowLeft") step(-1);
  }
  // A click that lands on the <dialog> itself (not its content) is a backdrop click.
  function onDialogClick(e: MouseEvent<HTMLDialogElement>) {
    if (e.target === e.currentTarget) dialogRef.current?.close();
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
        onClose={() => setActive(null)}
        onKeyDown={onKeyDown}
        onClick={onDialogClick}
        aria-label={current ? current.place : "Photo"}
        className="m-auto max-h-none max-w-none overflow-visible bg-transparent p-0 opacity-0 transition-opacity duration-200 ease-out backdrop:bg-black/30 backdrop:backdrop-blur-md open:opacity-100 starting:open:opacity-0 motion-reduce:transition-none"
      >
        {current && (
          // Only the figure scales in: a transform on the <dialog> itself would turn it into
          // the containing block for the fixed close button.
          <figure className="flex flex-col items-center gap-3 transition-[scale] duration-200 ease-out starting:scale-95 motion-reduce:transition-none">
            <Image
              key={current.src}
              src={current.src}
              alt={current.alt}
              width={current.width}
              height={current.height}
              sizes="92vw"
              className="h-auto max-h-[82svh] w-auto max-w-[92vw] rounded-md bg-white object-contain p-1.5 shadow-2xl"
            />
            <figcaption className="flex items-center gap-3 rounded-full bg-background/80 px-2 py-1 font-mono text-xs text-foreground shadow-sm backdrop-blur">
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
          type="button"
          onClick={() => dialogRef.current?.close()}
          aria-label="Close photo"
          className="fixed top-[max(1rem,env(safe-area-inset-top))] right-[max(1rem,env(safe-area-inset-right))] grid size-10 place-items-center rounded-full bg-background/80 text-foreground shadow-sm backdrop-blur hover:bg-background"
        >
          <X className="size-5" />
        </button>
      </dialog>
    </>
  );
}
