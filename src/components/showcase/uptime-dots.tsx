import { Suspense } from "react";
import { connection } from "next/server";
import { getUptime, type UptimeLevel, type UptimeSignal } from "@/lib/uptime";
import { cn } from "@/lib/utils";

// Three status lights for one monitored service (see src/lib/uptime.ts for what each means):
// Now · last 24 hours · worst day of the last 7 days. Bright green, orange or red only.
// All three breathe together; on HDR screens they peak brighter than SDR white.
// Rendered at request time inside Suspense, so the Projects section stays in the static
// shell; without data (no API key, API down) nothing is shown.

const DOT: Record<UptimeLevel, string> = {
  up: "bg-green-500 shadow-[0_0_6px_var(--color-green-500)]",
  degraded: "bg-orange-500 shadow-[0_0_6px_var(--color-orange-500)]",
  down: "bg-red-500 shadow-[0_0_6px_var(--color-red-500)]",
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

type Props = { monitor: string; subject: string };

async function Dots({ monitor, subject }: Props) {
  await connection();
  const uptime = await getUptime(monitor);
  if (!uptime) return null;
  const signals: UptimeSignal[] = [uptime.now, uptime.day, uptime.week];
  const words = signals.map((s) => `${s.label}: ${s.detail}`).join(". ");

  return (
    <span
      role="img"
      aria-label={`${subject} status, ${SUMMARY[uptime.now.level]}. ${words}.`}
      title={signals.map((s) => `${s.label}: ${s.detail}`).join("\n")}
      className="inline-flex items-center gap-1.5"
    >
      {signals.map((s) => (
        <span key={s.label} className="relative size-2">
          <span className={cn("uptime-dot absolute inset-0 rounded-full", DOT[s.level])} />
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

export function UptimeDots(props: Props) {
  return (
    <Suspense fallback={null}>
      <Dots {...props} />
    </Suspense>
  );
}
