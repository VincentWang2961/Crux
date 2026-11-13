import { Suspense } from "react";
import { connection } from "next/server";
import { getAvailability } from "@/lib/availability";
import { AvailabilityGrid } from "./availability-grid";
import { Section } from "./section";

// Depends on today's date, so it renders at request time inside Suspense; the rest of
// the page stays in the static shell.
async function AvailabilityData() {
  await connection();
  return <AvailabilityGrid data={await getAvailability()} />;
}

// Roughly the grid's footprint (14 days by the visible slots), so little jumps when it streams in.
function AvailabilitySkeleton() {
  return <div aria-hidden className="aspect-square max-w-lg animate-pulse rounded-md bg-muted/60" />;
}

export function AvailabilitySection() {
  return (
    <Section id="availability" command="cal --hourly" title="Availability">
      <Suspense fallback={<AvailabilitySkeleton />}>
        <AvailabilityData />
      </Suspense>
    </Section>
  );
}
