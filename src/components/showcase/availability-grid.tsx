"use client";

import { useRef, useState, type KeyboardEvent } from "react";
import type { AvailabilityStatus, AvailabilityWindow } from "@/lib/availability";
import { cn } from "@/lib/utils";

// Each status is told apart three ways, so it never relies on colour alone:
// fill colour, a mark (none = free / diagonal half = limited / cross = unavailable),
// and words for screen readers and the detail line.
const STATUS: Record<AvailabilityStatus, { label: string; tile: string; ink: string }> = {
  available: { label: "Available", tile: "bg-avail-ok", ink: "text-avail-ok-ink" },
  limited: { label: "Limited", tile: "bg-avail-limited", ink: "text-avail-limited-ink" },
  unavailable: { label: "Unavailable", tile: "bg-avail-no", ink: "text-avail-no-ink" },
};

// Visual gap between the two weeks. A transform (not padding) keeps every column the same
// width and adds no spacer cells to the table that screen readers would announce.
const WEEK_GAP = "translate-x-2";

const WEEKDAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

// Dates are plain YYYY-MM-DD strings; format them in UTC so server and client agree.
const at = (date: string) => new Date(`${date}T00:00:00Z`);
const fmt = (date: string, opts: Intl.DateTimeFormatOptions) =>
  new Intl.DateTimeFormat("en-GB", { timeZone: "UTC", ...opts }).format(at(date));

/** The status mark drawn inside a cell (scales with it). */
export function StatusMark({ status }: { status: AvailabilityStatus }) {
  if (status === "available") return null;
  return (
    <svg viewBox="0 0 10 10" aria-hidden className="absolute inset-0 size-full">
      {status === "limited" ? (
        <path d="M10 0V10H0Z" fill="currentColor" />
      ) : (
        <path
          d="M3 3l4 4M7 3l-4 4"
          stroke="currentColor"
          strokeWidth="1.3"
          strokeLinecap="round"
        />
      )}
    </svg>
  );
}

function Swatch({ status, className }: { status: AvailabilityStatus; className?: string }) {
  return (
    <span
      aria-hidden
      className={cn(
        "relative inline-block shrink-0 overflow-hidden rounded-[3px] forced-colors:border",
        STATUS[status].tile,
        STATUS[status].ink,
        className,
      )}
    >
      <StatusMark status={status} />
    </span>
  );
}

// GitHub-contribution-style matrix: one column per day (two weeks, a gap between them),
// one small square per time slot. Accessibility:
// - a real <table>: time slots are row headers, days are column headers, plus a caption;
// - every cell is a button with a full spoken label
//   ("Tuesday 17 November, 14:00 to 15:00: Limited, Commuting");
// - one tab stop (roving tabindex); ←/→ move by day, ↑/↓ by slot, Home/End to the
//   first/last slot of the day;
// - the selected (or hovered) slot is repeated below in larger text (aria-live);
// - the current slot is outlined, past slots dimmed; sizes are relative, so it scales
//   with browser zoom.
export function AvailabilityGrid({ data }: { data: AvailabilityWindow }) {
  const { days, today, now } = data;
  const perDay = days[0].slots.length;
  const todayIndex = Math.max(0, days.findIndex((d) => d.date === today));
  const nowSlot = days[todayIndex].slots.findIndex((s) => s.start <= now && now < s.end);
  const firstAhead = days[todayIndex].slots.findIndex((s) => s.end > now);
  const initial = todayIndex * perDay + (firstAhead === -1 ? perDay - 1 : firstAhead);

  const [selected, setSelected] = useState(initial);
  const [hovered, setHovered] = useState<number | null>(null);
  const buttons = useRef<(HTMLButtonElement | null)[]>([]);

  const shownIndex = hovered ?? selected;
  const shownDay = days[Math.floor(shownIndex / perDay)];
  const shown = shownDay.slots[shownIndex % perDay];

  function move(day: number, slot: number) {
    const d = Math.min(days.length - 1, Math.max(0, day));
    const s = Math.min(perDay - 1, Math.max(0, slot));
    const i = d * perDay + s;
    setSelected(i);
    buttons.current[i]?.focus();
  }

  function onKeyDown(e: KeyboardEvent, day: number, slot: number) {
    switch (e.key) {
      case "ArrowLeft": move(day - 1, slot); break;
      case "ArrowRight": move(day + 1, slot); break;
      case "ArrowUp": move(day, slot - 1); break;
      case "ArrowDown": move(day, slot + 1); break;
      case "Home": move(day, 0); break;
      case "End": move(day, perDay - 1); break;
      default: return;
    }
    e.preventDefault();
  }

  const longDate = (date: string) => fmt(date, { weekday: "long", day: "numeric", month: "long" });

  return (
    <div className="flex max-w-lg flex-col gap-4">
      <table className="w-[calc(100%-0.5rem)] table-fixed border-separate border-spacing-[3px] sm:border-spacing-1">
        <caption className="sr-only">
          Availability by {data.slotHours === 1 ? "hour" : `${data.slotHours}-hour slot`} from{" "}
          {longDate(days[0].date)} to {longDate(days[days.length - 1].date)}, Perth time. Use
          the arrow keys to move between days and times.
        </caption>
        <colgroup>
          <col className="w-7 sm:w-9" />
        </colgroup>
        <thead>
          <tr>
            <td />
            {days.map((d, i) => {
              const isToday = d.date === today;
              return (
                <th
                  key={d.date}
                  scope="col"
                  abbr={fmt(d.date, { weekday: "long", day: "numeric" })}
                  className={cn(
                    "pb-1 font-mono text-[0.625rem] leading-tight font-normal text-muted-foreground sm:text-[0.6875rem]",
                    i >= 7 && WEEK_GAP,
                  )}
                >
                  <span aria-hidden className="block">{WEEKDAYS[i % 7][0]}</span>
                  <span
                    aria-hidden
                    className={cn(
                      "mx-auto mt-0.5 flex size-[1.6em] items-center justify-center rounded-full",
                      isToday && "bg-foreground font-semibold text-background",
                    )}
                  >
                    {at(d.date).getUTCDate()}
                  </span>
                  <span className="sr-only">
                    {longDate(d.date)}
                    {isToday && " (today)"}
                  </span>
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {days[0].slots.map((slot, s) => (
            <tr key={slot.start}>
              <th
                scope="row"
                abbr={`${slot.start} to ${slot.end}`}
                className="pr-1 text-right align-middle font-mono text-[0.625rem] leading-none font-normal text-muted-foreground sm:text-[0.6875rem]"
              >
                {/* Label every other hour for 1-hour slots, every row otherwise. */}
                <span aria-hidden>
                  {(data.slotHours > 1 || s % 2 === 0) && slot.start.slice(0, 2)}
                </span>
                <span className="sr-only">{slot.start} to {slot.end}</span>
              </th>
              {days.map((d, day) => {
                const cell = d.slots[s];
                const i = day * perDay + s;
                const isNow = d.date === today && s === nowSlot;
                const isPast = d.date < today || (d.date === today && cell.end <= now);
                const label = `${longDate(d.date)}, ${cell.start} to ${cell.end}${isNow ? " (now)" : ""}: ${STATUS[cell.status].label}${cell.note ? `, ${cell.note}` : ""}`;
                return (
                  <td key={d.date} className={cn("p-0", day >= 7 && WEEK_GAP)}>
                    <button
                      ref={(el) => {
                        buttons.current[i] = el;
                      }}
                      type="button"
                      tabIndex={i === selected ? 0 : -1}
                      aria-label={label}
                      aria-current={isNow ? "time" : undefined}
                      aria-pressed={i === selected}
                      onClick={() => setSelected(i)}
                      onFocus={() => setSelected(i)}
                      onPointerEnter={() => setHovered(i)}
                      onPointerLeave={() => setHovered(null)}
                      onKeyDown={(e) => onKeyDown(e, day, s)}
                      className={cn(
                        "relative block aspect-square w-full overflow-hidden rounded-[3px] forced-colors:border",
                        STATUS[cell.status].tile,
                        STATUS[cell.status].ink,
                        isPast && "opacity-45",
                        isNow && "ring-2 ring-foreground ring-offset-1 ring-offset-background",
                        i === selected && !isNow && "ring-2 ring-foreground/50",
                        "transition-transform duration-100 hover:z-10 hover:scale-125 focus-visible:z-10 focus-visible:scale-125 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground motion-reduce:transition-none motion-reduce:hover:scale-100 motion-reduce:focus-visible:scale-100",
                      )}
                    >
                      <StatusMark status={cell.status} />
                    </button>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>

      {/* The selected (or hovered) slot in large text: the exact answer without decoding colours. */}
      <p
        aria-live="polite"
        className="flex min-h-7 items-center gap-2.5 pl-8 font-mono text-[0.8125rem] sm:pl-10 sm:text-base"
      >
        <Swatch status={shown.status} className="size-5" />
        <span className="min-w-0">
          {fmt(shownDay.date, { weekday: "short", day: "numeric", month: "short" })}
          <span className="text-muted-foreground"> · </span>
          {shown.start}–{shown.end}
          <span className="text-muted-foreground"> · </span>
          {STATUS[shown.status].label}
          {shown.note && <span className="text-muted-foreground"> · {shown.note}</span>}
        </span>
      </p>

      <ul
        aria-label="Legend"
        className="flex flex-wrap gap-x-5 gap-y-2 pl-8 text-xs text-muted-foreground sm:pl-10"
      >
        {(Object.keys(STATUS) as AvailabilityStatus[]).map((status) => (
          <li key={status} className="flex items-center gap-1.5">
            <Swatch status={status} className="size-4" />
            {STATUS[status].label}
          </li>
        ))}
      </ul>
    </div>
  );
}
