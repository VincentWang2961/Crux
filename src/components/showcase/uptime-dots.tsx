import { Suspense, type CSSProperties, type ReactNode } from "react";
import { IconTool } from "@tabler/icons-react";
import { connection } from "next/server";
import { getUptime, type UptimeLevel, type UptimeSignal } from "@/lib/uptime";

// Three status lights for one monitored service (see src/lib/uptime.ts for what each means):
// Now · last 24 hours · worst day of the last 7 days. Bright green, orange or red only.
// They breathe in a slow wave from left to right; on HDR screens each peaks brighter than SDR white.
// Rendered at request time inside Suspense, so the Projects section stays in the static
// shell; without data (no API key, API down) nothing is shown.

// The light's colour; its glow, hot centre and breathing are in `.uptime-dot` (globals.css).
const COLOR: Record<UptimeLevel, string> = {
  up: "var(--color-green-500)",
  degraded: "var(--color-orange-500)",
  down: "var(--color-red-500)",
};

// HDR glow sprite per colour (PQ / BT.2020 AVIF, from scripts/gen-uptime-hdr.py). Shown
// only on HDR displays, at the peak of each breath; see `.uptime-hdr` in globals.css.
const HDR: Record<UptimeLevel, string> = {
  up: "/uptime/hdr-green.avif",
  degraded: "/uptime/hdr-orange.avif",
  down: "/uptime/hdr-red.avif",
};

const SUMMARY: Record<UptimeLevel, string> = {
  up: "online",
  degraded: "having issues",
  down: "offline",
};

type Props = { monitor: string; subject: string; maintenance?: boolean };

async function Dots({ monitor, subject, maintenance }: Props) {
  await connection();
  const uptime = await getUptime(monitor);
  if (!uptime) return null;
  // A maintenance service that isn't up is down on purpose: say so instead of "offline".
  const inMaintenance = maintenance && uptime.now.level !== "up";
  const now = inMaintenance ? { ...uptime.now, detail: "Under maintenance" } : uptime.now;
  const signals: UptimeSignal[] = [now, uptime.day, uptime.week];
  const words = signals.map((s) => `${s.label}: ${s.detail}`).join(". ");
  const summary = inMaintenance ? "under maintenance" : SUMMARY[uptime.now.level];

  return (
    <span
      role="img"
      aria-label={`${subject} status, ${summary}. ${words}.`}
      title={signals.map((s) => `${s.label}: ${s.detail}`).join("\n")}
      className="inline-flex items-center gap-1.5"
    >
      {signals.map((s, i) => (
        <span key={s.label} style={{ "--i": i, "--c": COLOR[s.level] } as CSSProperties} className="uptime-light relative size-2">
          <span className="uptime-dot absolute inset-0 rounded-full" />
          {/* Plain <img>: next/image would re-encode the AVIF and lose its HDR metadata. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={HDR[s.level]}
            alt=""
            width={32}
            height={32}
            decoding="async"
            className="uptime-hdr pointer-events-none absolute top-1/2 left-1/2 size-8 max-w-none -translate-1/2"
          />
        </span>
      ))}
    </span>
  );
}

// The card's top-right corner for a `maintenance` service: "Under maintenance" while it
// isn't up, otherwise the usual period (`fallback`, also shown while loading or without data).
async function Corner({ monitor, fallback }: { monitor: string; fallback: ReactNode }) {
  await connection();
  const uptime = await getUptime(monitor);
  if (!uptime || uptime.now.level === "up") return fallback;
  return (
    <span className="inline-flex shrink-0 items-center gap-1 rounded-full border px-2 py-0.5 font-mono text-xs text-muted-foreground">
      <IconTool aria-hidden stroke={1.75} className="size-3.5" />
      Under maintenance
    </span>
  );
}

export function UptimeCorner(props: { monitor: string; fallback: ReactNode }) {
  return (
    <Suspense fallback={props.fallback}>
      <Corner {...props} />
    </Suspense>
  );
}

export function UptimeDots(props: Props) {
  return (
    <Suspense fallback={null}>
      <Dots {...props} />
    </Suspense>
  );
}
