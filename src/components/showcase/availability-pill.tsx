"use client";

import {
  useEffect,
  useId,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent,
} from "react";
import type {
  AvailabilityDay,
  AvailabilityStatus,
  AvailabilityWindow,
} from "@/lib/availability";
import { cn } from "@/lib/utils";

// Status pill in the hero bar: the answer first ("Unavailable · free 19:00"), the detail
// on demand. Clicking it unfolds a panel with the coming week (today through the same weekday next week) as free/busy timeline
// bars (one per day, contiguous time merged into segments, like Outlook / Google
// Calendar's scheduling views).

const STATUS: Record<AvailabilityStatus, { label: string; fill: string }> = {
  available: { label: "Available", fill: "bg-avail-ok" },
  limited: { label: "Limited", fill: "bg-avail-limited" },
  unavailable: { label: "Unavailable", fill: "bg-avail-no" },
};

// Panel open / close: clip-path reveal from the pill's corner, then rows fade in.
const OPEN_MS = 380;
const ROW_STAGGER_MS = 22;

type Segment = { start: string; end: string; status: AvailabilityStatus; note?: string };

const toMin = (t: string) => Number(t.slice(0, 2)) * 60 + Number(t.slice(3, 5));
const DAY_MIN = 24 * 60;

/** Merge consecutive slots with the same status and note into one segment. */
function segmentsOf(day: AvailabilityDay): Segment[] {
  const out: Segment[] = [];
  for (const s of day.slots) {
    const last = out[out.length - 1];
    if (last && last.status === s.status && last.note === s.note && last.end === s.start) {
      last.end = s.end;
    } else {
      out.push({ ...s });
    }
  }
  return out;
}

// Dates are plain YYYY-MM-DD strings; format them in UTC so server and client agree.
const at = (date: string) => new Date(`${date}T00:00:00Z`);
const fmt = (date: string, opts: Intl.DateTimeFormatOptions) =>
  new Intl.DateTimeFormat("en-GB", { timeZone: "UTC", ...opts }).format(at(date));
const longDate = (date: string) => fmt(date, { weekday: "long", day: "numeric", month: "long" });
const shortRange = (a: string, b: string) =>
  `${fmt(a, { day: "numeric" })}–${fmt(b, { day: "numeric", month: "short" })}`;

function summary(days: Segment[][], dates: string[], todayIndex: number, now: string) {
  const nowMin = toMin(now);
  const current = days[todayIndex].find((s) => toMin(s.start) <= nowMin && nowMin < toMin(s.end))!;
  if (current.status === "available") {
    return { current, hint: current.end === "24:00" ? "" : `until ${current.end}` };
  }
  // Next available segment after now.
  for (let d = todayIndex; d < days.length; d++) {
    const next = days[d].find(
      (s) => s.status === "available" && (d > todayIndex || toMin(s.start) > nowMin),
    );
    if (next) {
      const when = d === todayIndex ? next.start : `${fmt(dates[d], { weekday: "short" })} ${next.start}`;
      return { current, hint: `free ${when}` };
    }
  }
  return { current, hint: "" };
}

type Pos = { day: number; seg: number };

export function AvailabilityPill({ data }: { data: AvailabilityWindow }) {
  const { today, now, timezone } = data;
  const dates = data.days.map((d) => d.date);
  const days = data.days.map(segmentsOf);
  const todayIndex = Math.max(0, dates.indexOf(today));
  const nowMin = toMin(now);
  const nowSeg = days[todayIndex].findIndex(
    (s) => toMin(s.start) <= nowMin && nowMin < toMin(s.end),
  );
  const { current, hint } = summary(days, dates, todayIndex, now);

  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<Pos>({ day: todayIndex, seg: Math.max(0, nowSeg) });
  const [hovered, setHovered] = useState<Pos | null>(null);
  const panelId = useId();
  const root = useRef<HTMLDivElement>(null);
  const pill = useRef<HTMLButtonElement>(null);

  // Close on a click or tap outside.
  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      if (!root.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", onDown);
    return () => document.removeEventListener("pointerdown", onDown);
  }, [open]);

  function onRootKeyDown(e: KeyboardEvent) {
    if (e.key === "Escape" && open) {
      e.stopPropagation();
      setOpen(false);
      pill.current?.focus();
    }
  }

  // Roving focus: find the target segment through the DOM from the key event's button.
  function move(from: HTMLElement, day: number, seg: number) {
    const d = Math.min(days.length - 1, Math.max(0, day));
    const s = Math.min(days[d].length - 1, Math.max(0, seg));
    setSelected({ day: d, seg: s });
    from
      .closest("[data-panel]")
      ?.querySelector<HTMLButtonElement>(`[data-seg="${d}-${s}"]`)
      ?.focus();
  }

  function onSegKeyDown(e: KeyboardEvent, { day, seg }: Pos) {
    // ↑/↓ keep the same time of day: land on the segment covering this one's midpoint.
    const segment = days[day][seg];
    const mid = (toMin(segment.start) + toMin(segment.end)) / 2;
    const cover = (d: number) =>
      Math.max(0, days[d].findIndex((s) => toMin(s.start) <= mid && mid < toMin(s.end)));
    const el = e.currentTarget as HTMLElement;
    switch (e.key) {
      case "ArrowLeft": move(el, day, seg - 1); break;
      case "ArrowRight": move(el, day, seg + 1); break;
      case "ArrowUp": if (day > 0) move(el, day - 1, cover(day - 1)); break;
      case "ArrowDown": if (day < days.length - 1) move(el, day + 1, cover(day + 1)); break;
      case "Home": move(el, day, 0); break;
      case "End": move(el, day, days[day].length - 1); break;
      default: return;
    }
    e.preventDefault();
  }

  const shown = hovered ?? selected;
  const shownSeg = days[shown.day][shown.seg];

  // One rolling list: today through the same weekday next week.
  function rows() {
    const last = dates.length - 1;
    return (
      <section aria-label={`${longDate(dates[0])} to ${longDate(dates[last])}`}>
        <ul className="flex flex-col gap-0.5">
          {days.map((segs, day) => {
            const date = dates[day];
            const isToday = date === today;
            return (
              <li
                key={date}
                style={{ "--row-delay": `${(day + 1) * ROW_STAGGER_MS}ms` } as CSSProperties}
                className="grid -translate-y-0.5 grid-cols-[3.25rem_minmax(0,1fr)] items-center opacity-0 transition-[opacity,translate] delay-(--row-delay) duration-300 ease-out group-data-open:translate-y-0 group-data-open:opacity-100 motion-reduce:transition-none"
              >
                <span
                  aria-hidden
                  className={cn(
                    "w-fit rounded-full px-1.5 py-px whitespace-nowrap font-mono text-[0.6875rem] leading-4 text-muted-foreground",
                    isToday && "bg-foreground font-semibold text-background",
                  )}
                >
                  {fmt(date, { weekday: "short" }).slice(0, 2)} {at(date).getUTCDate()}
                </span>
                <div className="relative flex h-6 items-center">
                  {segs.map((s, seg) => {
                    const width = ((toMin(s.end) - toMin(s.start)) / DAY_MIN) * 100;
                    const isPast = date < today || (isToday && toMin(s.end) <= nowMin);
                    const isStop = selected.day === day && selected.seg === seg;
                    return (
                      <button
                        key={s.start}
                        data-seg={`${day}-${seg}`}
                        type="button"
                        tabIndex={isStop ? 0 : -1}
                        aria-label={`${longDate(date)}${isToday ? " (today)" : ""}, ${s.start} to ${s.end}: ${STATUS[s.status].label}${s.note ? `, ${s.note}` : ""}`}
                        onFocus={() => setSelected({ day, seg })}
                        onClick={() => setSelected({ day, seg })}
                        onPointerEnter={() => setHovered({ day, seg })}
                        onPointerLeave={() => setHovered(null)}
                        onKeyDown={(e) => onSegKeyDown(e, { day, seg })}
                        style={{ width: `${width}%` }}
                        className="group/seg h-full shrink-0 px-px outline-none first:pl-0 last:pr-0"
                      >
                        <span
                          className={cn(
                            "block h-2 w-full transition-[height] duration-150 group-first/seg:rounded-l-full group-last/seg:rounded-r-full group-hover/seg:h-3 group-focus-visible/seg:h-3 group-focus-visible/seg:ring-2 group-focus-visible/seg:ring-foreground forced-colors:border",
                            STATUS[s.status].fill,
                            isPast && "opacity-35",
                            isStop && "h-3",
                          )}
                        />
                      </button>
                    );
                  })}
                  {isToday && (
                    <span
                      aria-hidden
                      style={{ left: `${(nowMin / DAY_MIN) * 100}%` }}
                      className="pointer-events-none absolute inset-y-0.5 w-0.5 -translate-x-1/2 rounded-full bg-foreground"
                    />
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      </section>
    );
  }

  const place = timezone.split("/").pop()?.replace(/_/g, " ");

  return (
    // On phones the panel spans the hero bar (the nearest positioned ancestor); from sm
    // up it hangs from the pill's right edge.
    <div ref={root} onKeyDown={onRootKeyDown} className="sm:relative">
      <button
        ref={pill}
        type="button"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen(!open)}
        className="flex h-10 items-center gap-2 rounded-full border bg-background/80 pr-3.5 pl-3 font-mono text-xs backdrop-blur transition-colors hover:bg-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground sm:h-8"
      >
        <span aria-hidden className="relative flex size-2">
          {current.status === "available" && (
            <span className="absolute inset-0 animate-ping rounded-full bg-avail-ok opacity-60 motion-reduce:hidden" />
          )}
          <span className={cn("relative size-2 rounded-full", STATUS[current.status].fill)} />
        </span>
        <span className="sr-only">Availability now: </span>
        <span>{STATUS[current.status].label}</span>
        {hint && (
          <span className="hidden text-muted-foreground min-[22rem]:inline">
            <span aria-hidden>· </span>
            {hint}
          </span>
        )}
      </button>

      <div
        id={panelId}
        data-panel
        data-open={open || undefined}
        inert={!open}
        style={{ "--open": `${OPEN_MS}ms` } as CSSProperties}
        className={cn(
          "group absolute top-full right-0 left-0 z-40 mt-2 origin-top-right sm:left-auto sm:w-[26rem] rounded-2xl border bg-popover p-4 text-popover-foreground shadow-2xl shadow-black/10",
          "invisible scale-[0.97] opacity-0 [clip-path:inset(0_0_88%_55%_round_1rem)]",
          "transition-[clip-path,opacity,scale,visibility] duration-(--open) ease-[cubic-bezier(0.2,0.9,0.1,1)]",
          "data-open:visible data-open:scale-100 data-open:opacity-100 data-open:[clip-path:inset(0_round_1rem)]",
          "motion-reduce:transition-none",
        )}
      >
        <div className="flex flex-col gap-4">
          <p className="flex items-baseline justify-between font-mono text-[0.6875rem] text-muted-foreground">
            <span>
              {place} · {now}
            </span>
            <span aria-hidden>{shortRange(dates[0], dates[dates.length - 1])}</span>
          </p>

          <div className="flex flex-col gap-3">
            <div
              aria-hidden
              className="-mb-2 grid grid-cols-[3.25rem_minmax(0,1fr)] font-mono text-[0.625rem] text-muted-foreground"
            >
              <span />
              <span className="flex justify-between">
                {["00", "06", "12", "18", "24"].map((h) => (
                  <span key={h}>{h}</span>
                ))}
              </span>
            </div>
            {rows()}
          </div>

          {/* Selected or hovered segment in full words: the exact answer without decoding colours. */}
          <p
            aria-live="polite"
            className="flex min-h-5 items-center gap-2 border-t pt-3 font-mono text-xs sm:text-[0.8125rem]"
          >
            <span aria-hidden className={cn("size-2.5 shrink-0 rounded-full", STATUS[shownSeg.status].fill)} />
            <span>
              {fmt(dates[shown.day], { weekday: "short", day: "numeric", month: "short" })}
              <span className="text-muted-foreground"> · </span>
              {shownSeg.start}–{shownSeg.end}
              <span className="text-muted-foreground"> · </span>
              {STATUS[shownSeg.status].label}
              {shownSeg.note && <span className="text-muted-foreground"> · {shownSeg.note}</span>}
            </span>
          </p>

          <ul aria-label="Legend" className="-mt-2 flex gap-4 text-[0.6875rem] text-muted-foreground">
            {(Object.keys(STATUS) as AvailabilityStatus[]).map((s) => (
              <li key={s} className="flex items-center gap-1.5">
                <span aria-hidden className={cn("h-1.5 w-3 rounded-full", STATUS[s].fill)} />
                {STATUS[s].label}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
