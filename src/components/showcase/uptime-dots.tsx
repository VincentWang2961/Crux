import { Suspense } from "react";
import { connection } from "next/server";
import { getSiteUptime, type UptimeLevel, type UptimeSignal } from "@/lib/uptime";
import { cn } from "@/lib/utils";

// Three status lights for this website (see src/lib/uptime.ts for what each one means):
// Now · last 24 hours · worst day of the last 7 days. Bright green, orange or red only.
// Rendered at request time inside Suspense, so the Projects section stays in the static
// shell; without data (no API key, API down) nothing is shown.

const DOT: Record<UptimeLevel, string> = {
  up: "bg-green-500 shadow-[0_0_6px_var(--color-green-500)]",
  degraded: "bg-orange-500 shadow-[0_0_6px_var(--color-orange-500)]",
  down: "bg-red-500 shadow-[0_0_6px_var(--color-red-500)]",
};

const SUMMARY: Record<UptimeLevel, string> = {
  up: "online",
  degraded: "having issues",
  down: "offline",
};

async function Dots() {
  await connection();
  const uptime = await getSiteUptime();
  if (!uptime) return null;
  const signals: UptimeSignal[] = [uptime.now, uptime.day, uptime.week];
  const words = signals.map((s) => `${s.label}: ${s.detail}`).join(". ");

  return (
    <span
      role="img"
      aria-label={`Website status, ${SUMMARY[uptime.now.level]}. ${words}.`}
      title={signals.map((s) => `${s.label}: ${s.detail}`).join("\n")}
      className="inline-flex items-center gap-1.5"
    >
      {signals.map((s, i) => (
        <span
          key={s.label}
          className={cn(
            "size-2 rounded-full",
            DOT[s.level],
            // The "now" light breathes while the site is up, like the availability pill.
            i === 0 && s.level === "up" && "motion-safe:animate-pulse",
          )}
        />
      ))}
    </span>
  );
}

export function UptimeDots() {
  return (
    <Suspense fallback={null}>
      <Dots />
    </Suspense>
  );
}
