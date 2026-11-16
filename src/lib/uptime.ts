// Live uptime from UptimeRobot, for the status lights on project cards (Crux, the home lab).
// Server-only: the API key never reaches the browser.
//
// Three signals, read left to right, each coloured green / orange / red:
// 1. Now: is it up right now? (UptimeRobot's current monitor status)
// 2. 24 h: uptime over the last 24 hours.
// 3. 7 days: the worst single day (rolling 24 h window) of the last 7 days, so one bad
//    day stays visible for a week instead of being averaged away.
// Uptime thresholds: >= 99.9 % green, >= 99 % orange, below 99 % red.
//
// Each card names its monitor by ID in site-data.ts (`projects[].uptime.monitor`). All of
// them are fetched in one API call, at most once per CACHE_MS per server process
// (UptimeRobot checks every 5 minutes anyway, and the free API is rate limited). Without
// UPTIMEROBOT_API_KEY, or when the API fails, getUptime() returns null and the lights are
// simply not shown.

import { projects } from "@/lib/site-data";

export type UptimeLevel = "up" | "degraded" | "down";

export type UptimeSignal = {
  level: UptimeLevel;
  /** Short name of what the dot measures, e.g. "Last 24 hours". */
  label: string;
  /** What it found, in words, e.g. "99.95% uptime". */
  detail: string;
};

export type MonitorUptime = {
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

// Every monitor any card asks for, fetched together.
const MONITOR_IDS = [...new Set(projects.flatMap((p) => (p.uptime ? [p.uptime.monitor] : [])))];

let cache: { at: number; value: Map<string, MonitorUptime> } | null = null;
let pending: Promise<Map<string, MonitorUptime>> | null = null;

const pct = (n: number) => `${n.toFixed(n >= 99.995 ? 0 : 2)}%`;
const byRatio = (n: number): UptimeLevel => (n >= GOOD ? "up" : n >= FAIR ? "degraded" : "down");

type Monitor = { id: number; status: number; custom_uptime_ranges?: string };

function toUptime(monitor: Monitor): MonitorUptime | null {
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

async function fetchAll(key: string): Promise<Map<string, MonitorUptime>> {
  // Rolling 24 h windows, newest first: [now - 24 h, now], [now - 48 h, now - 24 h], …
  const now = Math.floor(Date.now() / 1000);
  const ranges = Array.from({ length: 7 }, (_, k) => `${now - DAY * (k + 1)}_${now - DAY * k}`).join("-");

  const res = await fetch(API, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded", "cache-control": "no-cache" },
    body: new URLSearchParams({
      api_key: key,
      format: "json",
      monitors: MONITOR_IDS.join("-"),
      custom_uptime_ranges: ranges,
    }),
    cache: "no-store",
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  if (!res.ok) throw new Error(`UptimeRobot ${res.status}`);
  const data = (await res.json()) as { stat?: string; monitors?: Monitor[] };
  if (data.stat !== "ok") throw new Error("UptimeRobot error");

  const out = new Map<string, MonitorUptime>();
  for (const m of data.monitors ?? []) {
    const u = toUptime(m);
    if (u) out.set(String(m.id), u);
  }
  return out;
}

/** Uptime of one UptimeRobot monitor (by ID), or null when unknown or not configured. */
export async function getUptime(monitorId: string): Promise<MonitorUptime | null> {
  const key = process.env.UPTIMEROBOT_API_KEY;
  if (!key || MONITOR_IDS.length === 0) return null;
  if (!cache || Date.now() - cache.at >= CACHE_MS) {
    pending ??= fetchAll(key)
      .then((value) => (cache = { at: Date.now(), value }).value)
      // Keep the last good reading through a brief API failure; with none yet, cache the
      // empty result too, so a down API isn't called on every request.
      .catch(() => (cache = { at: Date.now(), value: cache?.value ?? new Map() }).value)
      .finally(() => (pending = null));
    await pending;
  }
  return cache?.value.get(monitorId) ?? null;
}
