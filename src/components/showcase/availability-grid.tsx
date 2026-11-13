"use client";

import {
  useId,
  useRef,
  useState,
  useSyncExternalStore,
  type CSSProperties,
  type KeyboardEvent,
} from "react";
import { ChevronDown } from "lucide-react";
import type { AvailabilityDay, AvailabilityStatus, AvailabilityWindow } from "@/lib/availability";
import { cn } from "@/lib/utils";

// Colour only. The tokens also step in lightness (free = faint, busy = strong), so the
// statuses stay distinct in greyscale; the exact answer is always available as text in
// the detail line and in each square's spoken label.
const STATUS: Record<AvailabilityStatus, { label: string; tile: string }> = {
  available: { label: "Available", tile: "bg-avail-ok" },
  limited: { label: "Limited", tile: "bg-avail-limited" },
  unavailable: { label: "Unavailable", tile: "bg-avail-no" },
};

// Hours shown per breakpoint ([start, end) local hours, nested). Wider screens show more
// of the day, so the matrix uses the horizontal space instead of growing its squares.
const VISIBLE_HOURS = { base: [8, 22], sm: [7, 23], lg: [0, 24] } as const;
type Breakpoint = keyof typeof VISIBLE_HOURS;
// Width of one column (square + gap) per breakpoint; squares never grow past this.
const CELL = { base: "1.25rem", sm: "1.375rem", lg: "1.5rem" };
// Next-week expand / collapse: height, then each row fades in a little after the last.
const EXPAND_MS = 450;
const ROW_STAGGER_MS = 35;
// Width of the day-label column; the toggle, detail line and legend align past it.
const LABEL = "2.75rem";

// Tailwind's sm (40rem) and lg (64rem).
const QUERIES = { sm: "(min-width: 40rem)", lg: "(min-width: 64rem)" };
function subscribe(onChange: () => void) {
  const mqls = Object.values(QUERIES).map((q) => window.matchMedia(q));
  mqls.forEach((m) => m.addEventListener("change", onChange));
  return () => mqls.forEach((m) => m.removeEventListener("change", onChange));
}
const getBreakpoint = (): Breakpoint =>
  matchMedia(QUERIES.lg).matches ? "lg" : matchMedia(QUERIES.sm).matches ? "sm" : "base";
// Columns are hidden with CSS (no flash before hydration); this only drives keyboard
// navigation and the tab stop, so they never land on a hidden square.
const useBreakpoint = () =>
  useSyncExternalStore(subscribe, getBreakpoint, (): Breakpoint => "base");

const hourOf = (time: string) => Number(time.slice(0, 2));
const inRange = (hour: number, bp: Breakpoint) =>
  hour >= VISIBLE_HOURS[bp][0] && hour < VISIBLE_HOURS[bp][1];
// Display class for an hour column: always visible, or only from sm / lg up.
const columnClass = (hour: number) =>
  inRange(hour, "base") ? "" : inRange(hour, "sm") ? "hidden sm:table-cell" : "hidden lg:table-cell";

// Dates are plain YYYY-MM-DD strings; format them in UTC so server and client agree.
const at = (date: string) => new Date(`${date}T00:00:00Z`);
const fmt = (date: string, opts: Intl.DateTimeFormatOptions) =>
  new Intl.DateTimeFormat("en-GB", { timeZone: "UTC", ...opts }).format(at(date));
const longDate = (date: string) => fmt(date, { weekday: "long", day: "numeric", month: "long" });
const shortRange = (a: string, b: string) =>
  `${fmt(a, { day: "numeric" })}–${fmt(b, { day: "numeric", month: "short" })}`;

function Swatch({ status, className }: { status: AvailabilityStatus; className?: string }) {
  return (
    <span
      aria-hidden
      className={cn(
        "inline-block shrink-0 rounded-[2px] forced-colors:border",
        STATUS[status].tile,
        className,
      )}
    />
  );
}

type Pos = { day: number; slot: number };

// GitHub-contribution-style matrix: one row per day (Mon–Sun, like GitHub), one small
// square per time slot. This week is always shown; next week is folded behind a toggle
// and expands smoothly. Accessibility:
// - each week is a real <table>: days are row headers, times column headers, plus a caption;
// - every square is a button with a full spoken label
//   ("Monday 9 November, 09:00 to 10:00: Unavailable, At work");
// - one tab stop (roving tabindex); ←/→ move by slot, ↑/↓ by day (into next week when
//   open), Home/End jump to the first/last visible slot;
// - the selected (or hovered) slot is repeated below in larger text (aria-live);
// - the current slot is outlined, past slots dimmed; sizes are in rem, so it scales with zoom.
export function AvailabilityGrid({ data }: { data: AvailabilityWindow }) {
  const { days, today, now } = data;
  const perDay = days[0].slots.length;
  const bp = useBreakpoint();
  const [open, setOpen] = useState(false);
  const regionId = useId();

  const todayIndex = Math.max(0, days.findIndex((d) => d.date === today));
  const nowSlot = days[todayIndex].slots.findIndex((s) => s.start <= now && now < s.end);

  // Visible slot range for this breakpoint, and the reachable days.
  const hours = days[0].slots.map((s) => hourOf(s.start));
  const firstVisible = hours.findIndex((h) => inRange(h, bp));
  const lastVisible = hours.findLastIndex((h) => inRange(h, bp));
  const lastDay = open ? days.length - 1 : Math.min(6, days.length - 1);
  const clamp = ({ day, slot }: Pos): Pos => ({
    day: Math.min(lastDay, Math.max(0, day)),
    slot: Math.min(lastVisible, Math.max(firstVisible, slot)),
  });

  const [selected, setSelected] = useState<Pos>(() => ({
    day: todayIndex,
    slot:
      nowSlot !== -1
        ? nowSlot
        : Math.max(0, days[todayIndex].slots.findIndex((s) => s.end > now)),
  }));
  const [hovered, setHovered] = useState<Pos | null>(null);
  const buttons = useRef<(HTMLButtonElement | null)[]>([]);

  const stop = clamp(selected); // the one square in the tab order
  const shown = hovered ?? stop;
  const shownDay = days[shown.day];
  const shownSlot = shownDay.slots[shown.slot];

  function move(to: Pos) {
    const p = clamp(to);
    setSelected(p);
    buttons.current[p.day * perDay + p.slot]?.focus();
  }

  function onKeyDown(e: KeyboardEvent, p: Pos) {
    const to: Record<string, Pos> = {
      ArrowLeft: { ...p, slot: p.slot - 1 },
      ArrowRight: { ...p, slot: p.slot + 1 },
      ArrowUp: { ...p, day: p.day - 1 },
      ArrowDown: { ...p, day: p.day + 1 },
      Home: { ...p, slot: firstVisible },
      End: { ...p, slot: lastVisible },
    };
    if (!(e.key in to)) return;
    e.preventDefault();
    move(to[e.key]);
  }

  // Sizing: the matrix is as wide as its visible columns at the capped square size, or
  // the available width if that is smaller (then the squares shrink to fit).
  const count = (b: Breakpoint) => hours.filter((h) => inRange(h, b)).length;
  const sizing = {
    "--cols-base": count("base"),
    "--cols-sm": count("sm"),
    "--cols-lg": count("lg"),
    "--cell-base": CELL.base,
    "--cell-sm": CELL.sm,
    "--cell-lg": CELL.lg,
    "--label": LABEL,
    "--expand": `${EXPAND_MS}ms`,
  } as CSSProperties;

  // A plain render function (not a component), so squares keep their identity and focus.
  function renderWeek(week: AvailabilityDay[], offset: number, caption: string, header: boolean) {
    return (
      <table className="w-full table-fixed border-separate border-spacing-[3px]">
        <caption className="sr-only">{caption}</caption>
        <colgroup>
          <col className="w-(--label)" />
        </colgroup>
        <thead className={cn(!header && "sr-only")}>
          <tr>
            <td />
            {week[0].slots.map((slot) => {
              const h = hourOf(slot.start);
              return (
                <th
                  key={slot.start}
                  scope="col"
                  abbr={`${slot.start} to ${slot.end}`}
                  className={cn(
                    "pb-0.5 text-left font-mono text-[0.625rem] leading-none font-normal whitespace-nowrap text-muted-foreground",
                    columnClass(h),
                  )}
                >
                  <span aria-hidden>{h % 2 === 0 ? slot.start.slice(0, 2) : ""}</span>
                  <span className="sr-only">
                    {slot.start} to {slot.end}
                  </span>
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {week.map((d, r) => {
            const day = offset + r;
            const isToday = d.date === today;
            return (
              <tr
                key={d.date}
                style={{ "--row-delay": `${r * ROW_STAGGER_MS}ms` } as CSSProperties}
                className={cn(
                  offset > 0 &&
                    "-translate-y-1 opacity-0 transition-[opacity,translate] delay-(--row-delay) duration-300 ease-out group-data-open:translate-y-0 group-data-open:opacity-100 motion-reduce:transition-none",
                )}
              >
                <th
                  scope="row"
                  abbr={longDate(d.date)}
                  className="pr-1 text-left font-mono text-[0.625rem] leading-none font-normal whitespace-nowrap text-muted-foreground sm:text-[0.6875rem]"
                >
                  <span
                    aria-hidden
                    className={cn(
                      "inline-flex items-center gap-1 rounded-full px-1 py-0.5",
                      isToday && "bg-foreground font-semibold text-background",
                    )}
                  >
                    {fmt(d.date, { weekday: "short" }).slice(0, 2)}
                    <span className="tabular-nums">{at(d.date).getUTCDate()}</span>
                  </span>
                  <span className="sr-only">
                    {longDate(d.date)}
                    {isToday && " (today)"}
                  </span>
                </th>
                {d.slots.map((cell, slot) => {
                  const i = day * perDay + slot;
                  const isNow = isToday && slot === nowSlot;
                  const isPast = d.date < today || (isToday && cell.end <= now);
                  const isStop = stop.day === day && stop.slot === slot;
                  return (
                    <td key={cell.start} className={cn("p-0", columnClass(hourOf(cell.start)))}>
                      <button
                        ref={(el) => {
                          buttons.current[i] = el;
                        }}
                        type="button"
                        tabIndex={isStop ? 0 : -1}
                        aria-label={`${longDate(d.date)}, ${cell.start} to ${cell.end}${isNow ? " (now)" : ""}: ${STATUS[cell.status].label}${cell.note ? `, ${cell.note}` : ""}`}
                        aria-current={isNow ? "time" : undefined}
                        aria-pressed={isStop}
                        onClick={() => setSelected({ day, slot })}
                        onFocus={() => setSelected({ day, slot })}
                        onPointerEnter={() => setHovered({ day, slot })}
                        onPointerLeave={() => setHovered(null)}
                        onKeyDown={(e) => onKeyDown(e, { day, slot })}
                        className={cn(
                          "block aspect-square w-full rounded-[2px] forced-colors:border",
                          STATUS[cell.status].tile,
                          isPast && "opacity-40",
                          isNow && "ring-2 ring-foreground ring-offset-1 ring-offset-background",
                          isStop && !isNow && "ring-1 ring-foreground/60",
                          "transition-transform duration-100 hover:relative hover:z-10 hover:scale-150 focus-visible:relative focus-visible:z-10 focus-visible:scale-150 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-foreground motion-reduce:transition-none motion-reduce:hover:scale-100 motion-reduce:focus-visible:scale-100",
                        )}
                      />
                    </td>
                  );
                })}
              </tr>
            );
          })}
        </tbody>
      </table>
    );
  }

  const thisWeek = days.slice(0, 7);
  const nextWeek = days.slice(7, 14);

  return (
    <div
      style={sizing}
      className="flex w-[min(100%,calc(var(--label)+0.5rem+var(--cols)*var(--cell)))] flex-col gap-3 [--cell:var(--cell-base)] [--cols:var(--cols-base)] sm:[--cell:var(--cell-sm)] sm:[--cols:var(--cols-sm)] lg:[--cell:var(--cell-lg)] lg:[--cols:var(--cols-lg)]"
    >
      <div>
        {renderWeek(
          thisWeek,
          0,
          `This week, ${longDate(thisWeek[0].date)} to ${longDate(thisWeek[6].date)}, Perth time. Use the arrow keys to move between times and days.`,
          true,
        )}

        {nextWeek.length === 7 && (
          <>
            {/* Next week, folded. grid-template-rows 0fr → 1fr animates to the content's height. */}
            <div
              id={regionId}
              data-open={open || undefined}
              inert={!open}
              className="group grid grid-rows-[0fr] transition-[grid-template-rows] duration-(--expand) ease-[cubic-bezier(0.2,0.8,0.2,1)] data-open:grid-rows-[1fr] motion-reduce:transition-none"
            >
              <div className="min-h-0 overflow-hidden">
                <div className="pt-1.5">
                  {renderWeek(
                    nextWeek,
                    7,
                    `Next week, ${longDate(nextWeek[0].date)} to ${longDate(nextWeek[6].date)}, Perth time.`,
                    false,
                  )}
                </div>
              </div>
            </div>

            <button
              type="button"
              aria-expanded={open}
              aria-controls={regionId}
              onClick={() => setOpen(!open)}
              className="mt-1 ml-[calc(var(--label)+3px)] flex min-h-8 items-center gap-1.5 rounded-md font-mono text-xs text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground"
            >
              <ChevronDown
                aria-hidden
                className={cn(
                  "size-3.5 transition-transform duration-(--expand) motion-reduce:transition-none",
                  open && "rotate-180",
                )}
              />
              Next week
              <span aria-hidden className="text-muted-foreground/70">
                {shortRange(nextWeek[0].date, nextWeek[6].date)}
              </span>
            </button>
          </>
        )}
      </div>

      {/* The selected (or hovered) slot in large text: the exact answer without decoding colours. */}
      <p
        aria-live="polite"
        className="ml-[calc(var(--label)+3px)] flex min-h-7 items-center gap-2.5 font-mono text-[0.8125rem] sm:text-base"
      >
        <Swatch status={shownSlot.status} className="size-4" />
        <span className="min-w-0">
          {fmt(shownDay.date, { weekday: "short", day: "numeric", month: "short" })}
          <span className="text-muted-foreground"> · </span>
          {shownSlot.start}–{shownSlot.end}
          <span className="text-muted-foreground"> · </span>
          {STATUS[shownSlot.status].label}
          {shownSlot.note && <span className="text-muted-foreground"> · {shownSlot.note}</span>}
        </span>
      </p>

      <ul
        aria-label="Legend"
        className="ml-[calc(var(--label)+3px)] flex flex-wrap gap-x-4 gap-y-2 text-xs text-muted-foreground"
      >
        {(Object.keys(STATUS) as AvailabilityStatus[]).map((status) => (
          <li key={status} className="flex items-center gap-1.5">
            <Swatch status={status} className="size-3" />
            {STATUS[status].label}
          </li>
        ))}
      </ul>
    </div>
  );
}
