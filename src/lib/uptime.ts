// Live uptime of this website, from UptimeRobot, for the three status dots on the Crux
// project card. Server-only: the API key never reaches the browser.
//
// Three signals, read left to right, each coloured green / orange / red:
// 1. Now: is the site up right now? (UptimeRobot's current monitor status)
// 2. 24 h: uptime over the last 24 hours.
// 3. 7 days: the worst single day (rolling 24 h window) of the last 7 days, so one bad
//    day stays visible for a week instead of being averaged away.
// Uptime thresholds: >= 99.9 % green, >= 99 % orange, below 99 % red.
//
// The API is called at most once per CACHE_MS per server process (UptimeRobot checks the
// site every 5 minutes anyway, and the free API is rate limited). Without
// UPTIMEROBOT_API_KEY, or when the API fails, getSiteUptime() returns null and the dots
// are simply not shown. UPTIMEROBOT_MONITOR_ID picks which monitor to read (the account may
// watch other hosts too); without it the account's first monitor is used.

export type UptimeLevel = "up" | "degraded" | "down";

export type UptimeSignal = {
  level: UptimeLevel;
  /** Short name of what the dot measures, e.g. "Last 24 hours". */
  label: string;
  /** What it found, in words, e.g. "99.95% uptime". */
  detail: string;
};

export type SiteUptime = {
  now: UptimeSignal;
  day: UptimeSignal;
  week: UptimeSignal;
};

const API = "https://api.uptimerobot.com/v2/getMonitors";
const CACHE_MS = 5 * 60_000;
const TIMEOUT_MS = 4000;
const DAY = 86_400;
const GOOD = 99.9; // % and above: green
const FAIR = 99; // % and above: orange; below: red

let cache: { at: number; value: SiteUptime | null } | null = null;
let pending: Promise<SiteUptime | null> | null = null;

const pct = (n: number) => `${n.toFixed(n >= 99.995 ? 0 : 2)}%`;
const byRatio = (n: number): UptimeLevel => (n >= GOOD ? "up" : n >= FAIR ? "degraded" : "down");

type Monitor = { status: number; custom_uptime_ranges?: string };

async function fetchUptime(key: string, monitorId?: string): Promise<SiteUptime | null> {
  // Rolling 24 h windows, newest first: [now - 24 h, now], [now - 48 h, now - 24 h], …
  const now = Math.floor(Date.now() / 1000);
  const ranges = Array.from({ length: 7 }, (_, k) => `${now - DAY * (k + 1)}_${now - DAY * k}`).join("-");

  const res = await fetch(API, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded", "cache-control": "no-cache" },
    body: new URLSearchParams({
      api_key: key,
      format: "json",
      custom_uptime_ranges: ranges,
      ...(monitorId && { monitors: monitorId }),
    }),
    cache: "no-store",
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  if (!res.ok) return null;
  const data = (await res.json()) as { stat?: string; monitors?: Monitor[] };
  const monitor = data.stat === "ok" ? data.monitors?.[0] : undefined;
  if (!monitor) return null;

  const days = (monitor.custom_uptime_ranges ?? "").split("-").map(Number).filter(Number.isFinite);
  if (days.length === 0) return null;
  const worst = Math.min(...days);

  // UptimeRobot status: 2 up, 8 seems down (unconfirmed), 9 down, 0 paused, 1 not checked yet.
  const nowSignal: UptimeSignal =
    monitor.status === 2
      ? { level: "up", label: "Now", detail: "Online" }
      : monitor.status === 9
        ? { level: "down", label: "Now", detail: "Offline" }
        : { level: "degraded", label: "Now", detail: monitor.status === 8 ? "Not responding" : "Not being checked" };

  return {
    now: nowSignal,
    day: { level: byRatio(days[0]), label: "Last 24 hours", detail: `${pct(days[0])} uptime` },
    week: {
      level: byRatio(worst),
      label: "Last 7 days",
      detail: worst >= GOOD ? `Every day ≥ ${GOOD}% uptime` : `Worst day ${pct(worst)} uptime`,
    },
  };
}

export async function getSiteUptime(): Promise<SiteUptime | null> {
  const key = process.env.UPTIMEROBOT_API_KEY;
  if (!key) return null;
  const monitorId = process.env.UPTIMEROBOT_MONITOR_ID?.trim() || undefined;
  if (cache && Date.now() - cache.at < CACHE_MS) return cache.value;
  pending ??= fetchUptime(key, monitorId)
    .catch(() => null)
    .then((value) => {
      // Keep the last good reading through a brief API failure.
      if (value || !cache?.value) cache = { at: Date.now(), value };
      return value ?? cache?.value ?? null;
    })
    .finally(() => (pending = null));
  return pending;
}
