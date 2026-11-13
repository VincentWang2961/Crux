"use client";

import { useRef, useState, type KeyboardEvent } from "react";
import type { AvailabilityStatus, AvailabilityWindow } from "@/lib/availability";
import { cn } from "@/lib/utils";

// Each status is told apart three ways, so it never relies on colour alone:
// tile colour, glyph shape (● full / ◐ half / ✕ none) and, for screen readers and the
// detail line, words.
const STATUS: Record<
  AvailabilityStatus,
  { label: string; tile: string; ink: string }
> = {
  available: { label: "Available", tile: "bg-avail-ok", ink: "text-avail-ok-ink" },
  limited: { label: "Limited", tile: "bg-avail-limited", ink: "text-avail-limited-ink" },
  unavailable: { label: "Unavailable", tile: "bg-avail-no", ink: "text-avail-no-ink" },
};

const WEEKDAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

// Dates are plain YYYY-MM-DD strings; format them in UTC so server and client agree.
const at = (date: string) => new Date(`${date}T00:00:00Z`);
const fmt = (date: string, opts: Intl.DateTimeFormatOptions) =>
  new Intl.DateTimeFormat("en-GB", { timeZone: "UTC", ...opts }).format(at(date));

export function StatusGlyph({
  status,
  className,
}: {
  status: AvailabilityStatus;
  className?: string;
}) {
  return (
    <svg viewBox="0 0 16 16" aria-hidden className={cn("size-4 shrink-0", className)}>
      {status === "available" && <circle cx="8" cy="8" r="6" fill="currentColor" />}
      {status === "limited" && (
        <>
          <circle cx="8" cy="8" r="5.25" fill="none" stroke="currentColor" strokeWidth="1.5" />
          <path d="M8 2.75a5.25 5.25 0 0 0 0 10.5z" fill="currentColor" />
        </>
      )}
      {status === "unavailable" && (
        <path
          d="M3.5 3.5l9 9M12.5 3.5l-9 9"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
        />
      )}
    </svg>
  );
}

// Two-week grid (Mon–Sun columns, one row per week). Accessibility:
// - a real <table> with a caption and full weekday headers;
// - every day is a button with a full spoken label ("Tuesday 17 November, limited: …");
// - one tab stop for the grid (roving tabindex), arrows move by day / week, Home/End;
// - the selected day is repeated below in larger text (aria-live), for low-vision readers;
// - today is outlined (and aria-current), past days are dimmed but stay readable;
// - sizes are in rem, so the grid scales with browser zoom and text size.
export function AvailabilityGrid({ data }: { data: AvailabilityWindow }) {
  const { days, today } = data;
  const todayIndex = Math.max(0, days.findIndex((d) => d.date === today));
  const [selected, setSelected] = useState(todayIndex);
  const [hovered, setHovered] = useState<number | null>(null);
  const buttons = useRef<(HTMLButtonElement | null)[]>([]);

  const shown = days[hovered ?? selected];
  const weeks = Array.from({ length: days.length / 7 }, (_, w) => days.slice(w * 7, w * 7 + 7));
  const first = days[0].date;
  const last = days[days.length - 1].date;

  function spoken(i: number) {
    const d = days[i];
    const when = fmt(d.date, { weekday: "long", day: "numeric", month: "long" });
    return `${when}${d.date === today ? " (today)" : ""}: ${STATUS[d.status].label}${d.note ? `, ${d.note}` : ""}`;
  }

  function move(i: number) {
    const next = Math.min(days.length - 1, Math.max(0, i));
    setSelected(next);
    buttons.current[next]?.focus();
  }

  function onKeyDown(e: KeyboardEvent, i: number) {
    const step = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -7, ArrowDown: 7 }[e.key];
    if (step !== undefined) move(i + step);
    else if (e.key === "Home") move(i - (i % 7));
    else if (e.key === "End") move(i - (i % 7) + 6);
    else return;
    e.preventDefault();
  }

  return (
    <div className="flex max-w-md flex-col gap-4">
      <table className="w-full table-fixed border-separate border-spacing-1.5 sm:border-spacing-2">
        <caption className="sr-only">
          Availability from {fmt(first, { weekday: "long", day: "numeric", month: "long" })} to{" "}
          {fmt(last, { weekday: "long", day: "numeric", month: "long" })}. Use the arrow keys to
          move between days.
        </caption>
        <thead>
          <tr>
            {WEEKDAYS.map((day) => (
              <th
                key={day}
                scope="col"
                abbr={day}
                className="pb-1 font-mono text-xs font-normal text-muted-foreground"
              >
                <span aria-hidden>{day.slice(0, 2)}</span>
                <span className="sr-only">{day}</span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {weeks.map((week, w) => (
            <tr key={week[0].date}>
              {week.map((d, c) => {
                const i = w * 7 + c;
                const s = STATUS[d.status];
                const isToday = d.date === today;
                const isPast = d.date < today;
                return (
                  <td key={d.date} className="p-0">
                    <button
                      ref={(el) => {
                        buttons.current[i] = el;
                      }}
                      type="button"
                      tabIndex={i === selected ? 0 : -1}
                      aria-label={spoken(i)}
                      aria-current={isToday ? "date" : undefined}
                      aria-pressed={i === selected}
                      onClick={() => setSelected(i)}
                      onFocus={() => setSelected(i)}
                      onPointerEnter={() => setHovered(i)}
                      onPointerLeave={() => setHovered(null)}
                      onKeyDown={(e) => onKeyDown(e, i)}
                      className={cn(
                        "relative flex aspect-square w-full min-w-10 flex-col items-center justify-center gap-0.5 rounded-lg transition-[opacity,transform] duration-150 forced-colors:border",
                        s.tile,
                        s.ink,
                        isPast && "opacity-55",
                        isToday && "ring-2 ring-foreground ring-offset-2 ring-offset-background",
                        i === selected && !isToday && "ring-2 ring-foreground/40",
                        "hover:scale-105 focus-visible:scale-105 focus-visible:outline-3 focus-visible:outline-offset-3 focus-visible:outline-foreground motion-reduce:transition-none motion-reduce:hover:scale-100",
                      )}
                    >
                      <StatusGlyph status={d.status} className="size-[40%] max-w-5" />
                      <span className="font-mono text-[0.6875rem] leading-none text-foreground/80 sm:text-xs">
                        {at(d.date).getUTCDate()}
                      </span>
                    </button>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>

      {/* Selected (or hovered) day in large text: the exact answer without decoding colours. */}
      <p
        aria-live="polite"
        className="flex min-h-7 items-center gap-2.5 px-1.5 font-mono text-sm sm:px-2 sm:text-base"
      >
        <StatusGlyph status={shown.status} className={cn("size-5", STATUS[shown.status].ink)} />
        <span>
          {fmt(shown.date, { weekday: "short", day: "numeric", month: "short" })}
          <span className="text-muted-foreground"> · </span>
          {STATUS[shown.status].label}
          {shown.note && <span className="text-muted-foreground"> · {shown.note}</span>}
        </span>
      </p>

      <ul
        aria-label="Legend"
        className="flex flex-wrap gap-x-5 gap-y-2 px-1.5 text-xs text-muted-foreground sm:px-2"
      >
        {(Object.keys(STATUS) as AvailabilityStatus[]).map((status) => (
          <li key={status} className="flex items-center gap-1.5">
            <span
              aria-hidden
              className={cn(
                "flex size-5 items-center justify-center rounded",
                STATUS[status].tile,
                STATUS[status].ink,
              )}
            >
              <StatusGlyph status={status} className="size-3" />
            </span>
            {STATUS[status].label}
          </li>
        ))}
      </ul>
    </div>
  );
}
