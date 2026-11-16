import { Suspense } from "react";
import { connection } from "next/server";
import { getUptime, type UptimeLevel, type UptimeSignal } from "@/lib/uptime";
import { cn } from "@/lib/utils";

// Three status lights for one monitored service (see src/lib/uptime.ts for what each means):
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

export function UptimeDots(props: Props) {
  return (
    <Suspense fallback={null}>
      <Dots {...props} />
    </Suspense>
  );
}
