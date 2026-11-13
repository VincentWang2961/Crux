"use client";

import { useState, type PointerEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type {
  AvailabilitySlot,
  AvailabilityStatus,
  AvailabilityWindow,
  DayUpdate,
} from "@/lib/availability";
import { cn } from "@/lib/utils";

// Minimal availability editor: pick a brush (status + optional note), then click or drag
// across the hour cells to paint. "Save" sends the changed days to PUT /api/availability,
// each day replaced whole.

const STATUS: Record<AvailabilityStatus, { label: string; fill: string }> = {
  available: { label: "Available", fill: "bg-avail-ok" },
  limited: { label: "Limited", fill: "bg-avail-limited" },
  unavailable: { label: "Unavailable", fill: "bg-avail-no" },
};
const ORDER: AvailabilityStatus[] = ["available", "limited", "unavailable"];

const at = (date: string) => new Date(`${date}T00:00:00Z`);
const fmt = (date: string, opts: Intl.DateTimeFormatOptions) =>
  new Intl.DateTimeFormat("en-GB", { timeZone: "UTC", ...opts }).format(at(date));

/** Merge consecutive slots with the same status and note into blocks. */
function toBlocks(slots: AvailabilitySlot[]): DayUpdate["blocks"] {
  const out: DayUpdate["blocks"] = [];
  for (const s of slots) {
    const last = out[out.length - 1];
    if (last && last.status === s.status && last.note === s.note && last.end === s.start) last.end = s.end;
    else out.push({ start: s.start, end: s.end, status: s.status, ...(s.note && { note: s.note }) });
  }
  return out;
}

const key = (s: AvailabilitySlot) => `${s.status}|${s.note ?? ""}`;

export function AvailabilityEditor({ data }: { data: AvailabilityWindow }) {
  const router = useRouter();
  const [days, setDays] = useState(data.days);
  const [brush, setBrush] = useState<AvailabilityStatus>("unavailable");
  const [note, setNote] = useState("");
  // Last painted cell while a drag is in progress (null when not dragging).
  const [last, setLast] = useState<{ d: number; s: number } | null>(null);
  const [saving, setSaving] = useState<"idle" | "saving" | "saved" | "error">("idle");

  const dirty = days
    .map((d, i) => ({ d, i }))
    .filter(({ d, i }) => d.slots.some((s, j) => key(s) !== key(data.days[i].slots[j])));

  /** Paint slots `from`..`to` (inclusive, either order) of one day with the brush. */
  function paint(day: number, from: number, to = from) {
    const [lo, hi] = from <= to ? [from, to] : [to, from];
    setSaving("idle");
    setDays((prev) =>
      prev.map((d, i) =>
        i !== day
          ? d
          : {
              ...d,
              slots: d.slots.map((s, j) =>
                j < lo || j > hi ? s : { start: s.start, end: s.end, status: brush, ...(note.trim() && { note: note.trim() }) },
              ),
            },
      ),
    );
  }

  // Drag painting works with mouse, pen and touch: track the pointer over the grid and
  // paint whatever cell is under it. Pointer moves can skip cells on a fast drag, so
  // within a row everything between the last painted cell and the current one is filled.
  function cellAt(e: PointerEvent) {
    const el = document.elementFromPoint(e.clientX, e.clientY) as HTMLElement | null;
    const cell = el?.closest<HTMLElement>("[data-cell]");
    if (!cell) return null;
    const [d, s] = cell.dataset.cell!.split("-").map(Number);
    return { d, s };
  }
  function onPointerDown(e: PointerEvent) {
    const c = cellAt(e);
    if (!c) return;
    e.preventDefault();
    setLast(c);
    paint(c.d, c.s);
  }
  function onPointerMove(e: PointerEvent) {
    if (!last) return;
    const c = cellAt(e);
    if (!c || (c.d === last.d && c.s === last.s)) return;
    paint(c.d, c.d === last.d ? last.s : c.s, c.s);
    setLast(c);
  }

  async function save() {
    setSaving("saving");
    const body = { days: dirty.map(({ d }) => ({ date: d.date, blocks: toBlocks(d.slots) })) };
    const res = await fetch("/api/availability", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }).catch(() => null);
    if (res?.status === 401) return router.push("/");
    setSaving(res?.ok ? "saved" : "error");
    if (res?.ok) router.refresh();
  }

  async function logout() {
    await fetch("/api/admin/login", { method: "DELETE" }).catch(() => null);
    router.push("/");
  }

  const hours = days[0].slots;

  return (
    <div className="flex flex-col gap-8">
      <header className="flex flex-wrap items-baseline justify-between gap-3">
        <div>
          <p className="text-xs text-muted-foreground">$ crux admin availability</p>
          <h1 className="mt-1 font-sans text-lg font-semibold tracking-tight">Availability</h1>
        </div>
        <div className="flex items-center gap-4 text-xs">
          <span className="text-muted-foreground">
            {data.timezone.split("/").pop()} · {data.now}
          </span>
          <Link href="/" className="underline-offset-4 hover:underline">
            view site
          </Link>
          <button type="button" onClick={logout} className="underline-offset-4 hover:underline">
            log out
          </button>
        </div>
      </header>

      {/* Brush */}
      <section aria-label="Brush" className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div role="radiogroup" aria-label="Status" className="flex gap-1.5">
          {ORDER.map((s) => (
            <button
              key={s}
              type="button"
              role="radio"
              aria-checked={brush === s}
              onClick={() => setBrush(s)}
              className={cn(
                "flex h-9 items-center gap-2 rounded-full border px-3 text-xs transition-colors",
                brush === s ? "border-foreground bg-foreground text-background" : "hover:bg-muted",
              )}
            >
              <span aria-hidden className={cn("size-2.5 rounded-full", STATUS[s].fill)} />
              {STATUS[s].label}
            </button>
          ))}
        </div>
        <input
          value={note}
          onChange={(e) => setNote(e.target.value.slice(0, 80))}
          placeholder="note (optional), e.g. At work"
          aria-label="Note for painted hours"
          className="h-9 flex-1 rounded-full border bg-transparent px-4 text-xs outline-none placeholder:text-muted-foreground focus-visible:border-foreground"
        />
      </section>

      {/* Grid: rows = days, columns = hours. Click or drag to paint. */}
      <div className="-mx-1 overflow-x-auto px-1">
        <table className="w-full min-w-[36rem] table-fixed border-separate border-spacing-[2px]">
          <caption className="sr-only">
            Availability by hour. Choose a status, then click hours to set them.
          </caption>
          <colgroup>
            <col className="w-16" />
          </colgroup>
          <thead>
            <tr>
              <td />
              {hours.map((h) => (
                <th
                  key={h.start}
                  scope="col"
                  className="pb-1 text-left text-[0.625rem] font-normal text-muted-foreground"
                >
                  <span aria-hidden>{Number(h.start.slice(0, 2)) % 3 === 0 ? h.start.slice(0, 2) : ""}</span>
                  <span className="sr-only">{h.start}</span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={() => setLast(null)}
            onPointerCancel={() => setLast(null)}
            onPointerLeave={() => setLast(null)}
            className="touch-none select-none"
          >
            {days.map((d, di) => {
              const changed = dirty.some((x) => x.i === di);
              return (
                <tr key={d.date}>
                  <th scope="row" className="pr-2 text-left text-[0.6875rem] font-normal whitespace-nowrap">
                    <span className={cn(changed && "font-semibold")}>
                      {fmt(d.date, { weekday: "short", day: "numeric" })}
                    </span>
                    {changed && <span aria-label="(unsaved)"> •</span>}
                  </th>
                  {d.slots.map((s, si) => (
                    <td key={s.start} className="p-0">
                      <button
                        type="button"
                        data-cell={`${di}-${si}`}
                        title={`${s.start}–${s.end} · ${STATUS[s.status].label}${s.note ? ` · ${s.note}` : ""}`}
                        aria-label={`${fmt(d.date, { weekday: "long", day: "numeric", month: "long" })}, ${s.start} to ${s.end}: ${STATUS[s.status].label}${s.note ? `, ${s.note}` : ""}`}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault();
                            paint(di, si);
                          }
                        }}
                        className={cn(
                          "block h-7 w-full rounded-[3px] transition-[filter] hover:brightness-110 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-foreground",
                          STATUS[s.status].fill,
                          s.note && "bg-[linear-gradient(transparent_70%,rgb(0_0_0/0.15)_70%)] bg-blend-multiply",
                        )}
                      />
                    </td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <footer className="flex flex-wrap items-center gap-3 text-xs">
        <button
          type="button"
          onClick={save}
          disabled={dirty.length === 0 || saving === "saving"}
          className="h-9 rounded-full bg-foreground px-5 text-background transition-opacity disabled:opacity-40"
        >
          {saving === "saving" ? "saving…" : `save${dirty.length ? ` ${dirty.length} day${dirty.length > 1 ? "s" : ""}` : ""}`}
        </button>
        <button
          type="button"
          onClick={() => {
            setDays(data.days);
            setSaving("idle");
          }}
          disabled={dirty.length === 0}
          className="h-9 rounded-full border px-4 transition-opacity hover:bg-muted disabled:opacity-40"
        >
          discard
        </button>
        <span aria-live="polite" className="text-muted-foreground">
          {saving === "saved" && "saved"}
          {saving === "error" && "couldn't save, try again"}
        </span>
      </footer>
    </div>
  );
}
