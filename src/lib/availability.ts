// Availability calendar data (bottom section of the home page and GET /api/availability).
//
// Storage holds time *blocks* (date + start/end + status), like calendar events. The site
// samples them into a fixed matrix: one column per day, one cell per time slot
// (`AVAILABILITY_SLOT_HOURS`, 1 or 2 h). Because storage is blocks, not slots, the slot
// size and visible hours can change without migrating data.
//
// Everything goes through `getAvailability()`. Today the source is generated demo data;
// when the admin page and write API arrive, replace `demoSource` with a real
// `AvailabilitySource` and nothing else has to change. See "Availability" in AGENTS.md.

export type AvailabilityStatus = "available" | "limited" | "unavailable";

/** A stored block. Times are local "HH:MM" in `AVAILABILITY_TIMEZONE`; `end` is exclusive ("24:00" allowed). */
export type AvailabilityBlock = {
  date: string; // YYYY-MM-DD
  start: string;
  end: string;
  status: AvailabilityStatus;
  /** Optional short detail, e.g. "At work". Shown when a slot is selected. */
  note?: string;
};

/** One cell of the matrix. */
export type AvailabilitySlot = {
  start: string; // "HH:MM"
  end: string;
  status: AvailabilityStatus;
  note?: string;
};

export type AvailabilityDay = { date: string; slots: AvailabilitySlot[] };

/** What the page and the API serve. */
export type AvailabilityWindow = {
  timezone: string;
  /** Local date and time now, so the client can mark the current slot and dim the past. */
  today: string;
  now: string;
  slotHours: number;
  /** Monday of the current week through Sunday of the last week, in order. */
  days: AvailabilityDay[];
};

/** Pluggable storage. `from`/`to` are inclusive local dates (YYYY-MM-DD). */
export interface AvailabilitySource {
  getRange(from: string, to: string): Promise<AvailabilityBlock[]>;
}

/** Vincent is based in Perth; "today", "now" and the week boundaries are computed there. */
export const AVAILABILITY_TIMEZONE = "Australia/Perth";
/** Current week plus the next one. */
export const AVAILABILITY_WEEKS = 2;
/** Visible hours (local), and the size of one cell. (END - START) must divide by SLOT_HOURS. */
export const AVAILABILITY_DAY_START = 8;
export const AVAILABILITY_DAY_END = 22;
export const AVAILABILITY_SLOT_HOURS = 1;
/** Time not covered by any block falls back to this status. */
export const DEFAULT_STATUS: AvailabilityStatus = "available";

// ---- Date / time helpers (plain strings, date arithmetic in UTC so DST never shifts a day)

export function localDateTime(now: Date, timeZone = AVAILABILITY_TIMEZONE) {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-CA", {
      timeZone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
    })
      .formatToParts(now)
      .map((p) => [p.type, p.value]),
  );
  return { date: `${parts.year}-${parts.month}-${parts.day}`, time: `${parts.hour}:${parts.minute}` };
}

export function addDays(date: string, n: number): string {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

/** Monday = 0 … Sunday = 6. */
export function weekdayIndex(date: string): number {
  return (new Date(`${date}T00:00:00Z`).getUTCDay() + 6) % 7;
}

const hhmm = (hour: number) => `${String(hour).padStart(2, "0")}:00`;
const RANK: Record<AvailabilityStatus, number> = { available: 0, limited: 1, unavailable: 2 };

// ---- Demo data (replace with a real source) ----------------------------------------

type DemoBlock = Omit<AvailabilityBlock, "date">;
const WEEKDAY: DemoBlock[] = [
  { start: "09:00", end: "17:00", status: "unavailable", note: "At work" },
  { start: "17:00", end: "19:00", status: "limited", note: "Commuting, messages only" },
];
// Monday … Sunday.
const DEMO_WEEK: DemoBlock[][] = [
  WEEKDAY,
  [...WEEKDAY, { start: "19:00", end: "21:00", status: "unavailable", note: "Gym" }],
  WEEKDAY,
  WEEKDAY,
  [{ start: "09:00", end: "15:00", status: "unavailable", note: "At work" }, { start: "15:00", end: "18:00", status: "limited" }],
  [{ start: "10:00", end: "13:00", status: "limited", note: "Out and about" }],
  [{ start: "14:00", end: "18:00", status: "unavailable", note: "Family time" }],
];
// One-off overrides, keyed by offset from Monday of the current week (replace that day).
const DEMO_OVERRIDES: Record<number, DemoBlock[]> = {
  9: [{ start: "00:00", end: "24:00", status: "unavailable", note: "Travelling" }],
  10: [
    { start: "00:00", end: "12:00", status: "unavailable", note: "Travelling" },
    { start: "12:00", end: "18:00", status: "limited", note: "On the road" },
  ],
  12: [{ start: "12:00", end: "24:00", status: "unavailable", note: "Away" }],
};

const demoSource: AvailabilitySource = {
  async getRange(from, to) {
    const blocks: AvailabilityBlock[] = [];
    for (let date = from, i = 0; date <= to; date = addDays(date, 1), i++) {
      for (const b of DEMO_OVERRIDES[i] ?? DEMO_WEEK[weekdayIndex(date)]) blocks.push({ date, ...b });
    }
    return blocks;
  },
};

// Swap this for the real source when the admin/API work lands.
const source: AvailabilitySource = demoSource;

/**
 * The matrix shown on the site: Monday of the current week (in Perth) for
 * `AVAILABILITY_WEEKS` weeks, one slot per `AVAILABILITY_SLOT_HOURS` between
 * `AVAILABILITY_DAY_START` and `AVAILABILITY_DAY_END`. A slot overlapped by several
 * blocks takes the most restrictive status (with that block's note); uncovered time is
 * `DEFAULT_STATUS`. Call at request time (after `connection()`): it depends on the clock.
 */
export async function getAvailability(nowDate = new Date()): Promise<AvailabilityWindow> {
  const { date: today, time: now } = localDateTime(nowDate);
  const from = addDays(today, -weekdayIndex(today));
  const to = addDays(from, AVAILABILITY_WEEKS * 7 - 1);
  const blocks = await source.getRange(from, to);

  const days: AvailabilityDay[] = [];
  for (let date = from; date <= to; date = addDays(date, 1)) {
    const own = blocks.filter((b) => b.date === date);
    const slots: AvailabilitySlot[] = [];
    for (let h = AVAILABILITY_DAY_START; h < AVAILABILITY_DAY_END; h += AVAILABILITY_SLOT_HOURS) {
      const start = hhmm(h);
      const end = hhmm(h + AVAILABILITY_SLOT_HOURS);
      // "HH:MM" strings compare correctly as text.
      const hit = own
        .filter((b) => b.start < end && b.end > start)
        .sort((a, b) => RANK[b.status] - RANK[a.status])[0];
      slots.push(
        hit
          ? { start, end, status: hit.status, ...(hit.note && { note: hit.note }) }
          : { start, end, status: DEFAULT_STATUS },
      );
    }
    days.push({ date, slots });
  }
  return { timezone: AVAILABILITY_TIMEZONE, today, now, slotHours: AVAILABILITY_SLOT_HOURS, days };
}
