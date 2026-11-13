// Availability calendar data (bottom section of the home page and GET /api/availability).
//
// Everything that reads or writes availability goes through `getAvailability()`. Today it
// returns generated demo data; when the admin page and API arrive, replace `demoSource`
// with a real `AvailabilitySource` (database, KV, external calendar …) and nothing else
// has to change. See "Availability" in AGENTS.md for the planned write API.

export type AvailabilityStatus = "available" | "limited" | "unavailable";

/** One calendar day. `date` is a local date (YYYY-MM-DD) in `AVAILABILITY_TIMEZONE`. */
export type AvailabilityDay = {
  date: string;
  status: AvailabilityStatus;
  /** Optional short detail, e.g. "Afternoons only". Shown when the day is selected. */
  note?: string;
};

/** What the page and the API serve: a fixed window of consecutive days. */
export type AvailabilityWindow = {
  timezone: string;
  /** Today's local date, so the client can mark it and dim the past. */
  today: string;
  /** Monday of the current week through Sunday of the last week, in order. */
  days: AvailabilityDay[];
};

/** Pluggable storage. `from`/`to` are inclusive local dates (YYYY-MM-DD). */
export interface AvailabilitySource {
  getRange(from: string, to: string): Promise<AvailabilityDay[]>;
}

/** Vincent is based in Perth; "today" and the week boundaries are computed there. */
export const AVAILABILITY_TIMEZONE = "Australia/Perth";
/** Current week plus the next one. */
export const AVAILABILITY_WEEKS = 2;
/** Days with no stored entry fall back to this status. */
export const DEFAULT_STATUS: AvailabilityStatus = "available";

// ---- Date helpers (plain YYYY-MM-DD strings, arithmetic in UTC so DST never shifts a day)

export function localDate(now: Date, timeZone = AVAILABILITY_TIMEZONE): string {
  // en-CA formats as YYYY-MM-DD.
  return new Intl.DateTimeFormat("en-CA", { timeZone }).format(now);
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

// ---- Demo data (replace with a real source) ----------------------------------------

// A repeating, plausible week so the demo always looks sensible whatever today is.
const DEMO_PATTERN: Omit<AvailabilityDay, "date">[] = [
  { status: "available" },
  { status: "limited", note: "Afternoons only" },
  { status: "available" },
  { status: "available" },
  { status: "limited", note: "Until 3 pm" },
  { status: "unavailable" },
  { status: "unavailable" },
];
// A few one-off overrides, keyed by offset from Monday of the current week.
const DEMO_OVERRIDES: Record<number, Omit<AvailabilityDay, "date">> = {
  9: { status: "unavailable", note: "Travelling" },
  10: { status: "unavailable", note: "Travelling" },
  12: { status: "limited", note: "Mornings only" },
};

const demoSource: AvailabilitySource = {
  async getRange(from, to) {
    const days: AvailabilityDay[] = [];
    for (let date = from, i = 0; date <= to; date = addDays(date, 1), i++) {
      days.push({ date, ...(DEMO_OVERRIDES[i] ?? DEMO_PATTERN[weekdayIndex(date)]) });
    }
    return days;
  },
};

// Swap this for the real source when the admin/API work lands.
const source: AvailabilitySource = demoSource;

/**
 * The window shown on the site: Monday of the current week (in Perth) for
 * `AVAILABILITY_WEEKS` weeks. Missing days are filled with `DEFAULT_STATUS`.
 * Call it at request time (after `connection()`), since it depends on the current date.
 */
export async function getAvailability(now = new Date()): Promise<AvailabilityWindow> {
  const today = localDate(now);
  const from = addDays(today, -weekdayIndex(today));
  const to = addDays(from, AVAILABILITY_WEEKS * 7 - 1);
  const stored = new Map((await source.getRange(from, to)).map((d) => [d.date, d]));

  const days: AvailabilityDay[] = [];
  for (let date = from; date <= to; date = addDays(date, 1)) {
    days.push(stored.get(date) ?? { date, status: DEFAULT_STATUS });
  }
  return { timezone: AVAILABILITY_TIMEZONE, today, days };
}
