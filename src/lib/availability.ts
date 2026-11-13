// Availability data (the hero status pill and GET /api/availability).
//
// Storage holds time *blocks* (date + start/end + status), like calendar events. The site
// samples them into fixed time slots per day
// (`AVAILABILITY_SLOT_HOURS`, 1 or 2 h). Because storage is blocks, not slots, the slot
// size and visible hours can change without migrating data.
//
// Everything goes through `getAvailability()`. Today the source is generated demo data;
// when the admin page and write API arrive, replace `demoSource` with a real
// `AvailabilitySource` and nothing else has to change. See "Availability" in AGENTS.md.

import { promises as fs } from "node:fs";
import path from "node:path";

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

/** One time slot of a day. */
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
  /** Today through the same weekday next week (`AVAILABILITY_DAYS` days), in order. */
  days: AvailabilityDay[];
};

/** Pluggable storage. `from`/`to` are inclusive local dates (YYYY-MM-DD). */
export interface AvailabilitySource {
  getRange(from: string, to: string): Promise<AvailabilityBlock[]>;
}

/** Vincent is based in Perth; "today", "now" and the week boundaries are computed there. */
export const AVAILABILITY_TIMEZONE = "Australia/Perth";
/** Rolling window from today: 8 days = today through the same weekday next week. */
export const AVAILABILITY_DAYS = 8;
/**
 * Hours served (local) and the size of one cell; (END - START) must divide by SLOT_HOURS.
 * The whole day is served; the grid shows fewer hours on narrow screens (see
 * `VISIBLE_HOURS` in availability-grid.tsx).
 */
export const AVAILABILITY_DAY_START = 0;
export const AVAILABILITY_DAY_END = 24;
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
const NIGHT: DemoBlock[] = [
  { start: "00:00", end: "07:00", status: "unavailable", note: "Asleep" },
  { start: "07:00", end: "08:00", status: "limited", note: "Early morning" },
  { start: "22:00", end: "23:00", status: "limited", note: "Late evening" },
  { start: "23:00", end: "24:00", status: "unavailable", note: "Asleep" },
];
const WEEKDAY: DemoBlock[] = [
  ...NIGHT,
  { start: "09:00", end: "17:00", status: "unavailable", note: "At work" },
  { start: "17:00", end: "19:00", status: "limited", note: "Commuting, messages only" },
];
// Monday … Sunday.
const DEMO_WEEK: DemoBlock[][] = [
  WEEKDAY,
  [...WEEKDAY, { start: "19:00", end: "21:00", status: "unavailable", note: "Gym" }],
  WEEKDAY,
  WEEKDAY,
  [...NIGHT, { start: "09:00", end: "15:00", status: "unavailable", note: "At work" }, { start: "15:00", end: "18:00", status: "limited" }],
  [...NIGHT, { start: "10:00", end: "13:00", status: "limited", note: "Out and about" }],
  [...NIGHT, { start: "14:00", end: "18:00", status: "unavailable", note: "Family time" }],
];
// One-off overrides, keyed by offset from today (replace that day).
const DEMO_OVERRIDES: Record<number, DemoBlock[]> = {
  3: [{ start: "00:00", end: "24:00", status: "unavailable", note: "Travelling" }],
  4: [
    ...NIGHT,
    { start: "00:00", end: "12:00", status: "unavailable", note: "Travelling" },
    { start: "12:00", end: "18:00", status: "limited", note: "On the road" },
  ],
  6: [...NIGHT, { start: "12:00", end: "24:00", status: "unavailable", note: "Away" }],
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

// ---- File storage (what the admin page writes) ---------------------------------------
//
// One JSON file: { "days": { "YYYY-MM-DD": Block[] (without date) } }. A stored day
// replaces that whole day; days never saved fall back to the demo template above, so the
// site shows something sensible before the first edit. An empty array is a saved day with
// no blocks (all `DEFAULT_STATUS`). Lives in AVAILABILITY_DATA_DIR (default ./data), which
// the Docker setup mounts as a named volume so edits survive rebuilds.

type StoredFile = { days: Record<string, Omit<AvailabilityBlock, "date">[]> };

const dataFile = () =>
  path.join(process.env.AVAILABILITY_DATA_DIR ?? path.join(process.cwd(), "data"), "availability.json");

async function readStore(): Promise<StoredFile> {
  try {
    const parsed = JSON.parse(await fs.readFile(dataFile(), "utf8"));
    return { days: parsed?.days && typeof parsed.days === "object" ? parsed.days : {} };
  } catch (e) {
    if ((e as NodeJS.ErrnoException).code === "ENOENT") return { days: {} };
    throw e;
  }
}

async function writeStore(store: StoredFile) {
  const file = dataFile();
  await fs.mkdir(path.dirname(file), { recursive: true });
  const tmp = `${file}.${process.pid}.tmp`;
  await fs.writeFile(tmp, JSON.stringify(store, null, 2));
  await fs.rename(tmp, file); // atomic replace
}

const fileSource: AvailabilitySource = {
  async getRange(from, to) {
    const [store, template] = await Promise.all([readStore(), demoSource.getRange(from, to)]);
    const blocks = template.filter((b) => !(b.date in store.days));
    for (const [date, own] of Object.entries(store.days)) {
      if (date >= from && date <= to) for (const b of own) blocks.push({ date, ...b });
    }
    return blocks;
  },
};

const source: AvailabilitySource = fileSource;

// ---- Writes (admin only; the caller must check the session) -------------------------

export type DayUpdate = { date: string; blocks: Omit<AvailabilityBlock, "date">[] };

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const TIME_RE = /^([01]\d|2[0-3]):(00|30)$|^24:00$/;
const STATUSES: AvailabilityStatus[] = ["available", "limited", "unavailable"];
export const NOTE_MAX = 80;

/** Returns an error message, or null when the updates are valid. */
export function validateUpdates(input: unknown): string | null {
  if (!Array.isArray(input) || input.length === 0 || input.length > 31) return "days must be a non-empty array (max 31)";
  for (const day of input as DayUpdate[]) {
    if (!day || typeof day.date !== "string" || !DATE_RE.test(day.date)) return "invalid date";
    if (!Array.isArray(day.blocks)) return `${day.date}: blocks must be an array`;
    const sorted = [...day.blocks].sort((a, b) => (a.start < b.start ? -1 : 1));
    for (let i = 0; i < sorted.length; i++) {
      const b = sorted[i];
      if (!TIME_RE.test(b.start) || !TIME_RE.test(b.end) || b.start >= b.end) return `${day.date}: invalid time range`;
      if (!STATUSES.includes(b.status)) return `${day.date}: invalid status`;
      if (b.note !== undefined && (typeof b.note !== "string" || b.note.length > NOTE_MAX)) return `${day.date}: note too long`;
      if (i > 0 && sorted[i - 1].end > b.start) return `${day.date}: blocks overlap`;
    }
  }
  return null;
}

/** Replace whole days in storage. Days more than 30 days old are pruned. */
export async function saveAvailabilityDays(updates: DayUpdate[]) {
  const store = await readStore();
  for (const { date, blocks } of updates) {
    store.days[date] = blocks.map(({ start, end, status, note }) => ({
      start,
      end,
      status,
      ...(note?.trim() && { note: note.trim() }),
    }));
  }
  const cutoff = addDays(localDateTime(new Date()).date, -30);
  for (const date of Object.keys(store.days)) if (date < cutoff) delete store.days[date];
  await writeStore(store);
}

/**
 * The window shown on the site: today (in Perth) through the same weekday next week
 * (`AVAILABILITY_DAYS` days), one slot per `AVAILABILITY_SLOT_HOURS` between
 * `AVAILABILITY_DAY_START` and `AVAILABILITY_DAY_END`. A slot overlapped by several
 * blocks takes the most restrictive status (with that block's note); uncovered time is
 * `DEFAULT_STATUS`. Call at request time (after `connection()`): it depends on the clock.
 */
export async function getAvailability(nowDate = new Date()): Promise<AvailabilityWindow> {
  const { date: today, time: now } = localDateTime(nowDate);
  const from = today;
  const to = addDays(from, AVAILABILITY_DAYS - 1);
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
