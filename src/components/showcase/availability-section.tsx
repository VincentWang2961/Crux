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

// Same footprint as the grid (two rows of seven tiles), so nothing jumps when it streams in.
function AvailabilitySkeleton() {
  return (
    <div aria-hidden className="max-w-md">
      <div className="grid grid-cols-7 gap-1.5 p-1.5 pt-7 sm:gap-2 sm:p-2 sm:pt-8">
        {Array.from({ length: 14 }, (_, i) => (
          <div key={i} className="aspect-square min-w-10 animate-pulse rounded-lg bg-muted" />
        ))}
      </div>
    </div>
  );
}

export function AvailabilitySection() {
  return (
    <Section id="availability" command="cal --next 2w" title="Availability">
      <Suspense fallback={<AvailabilitySkeleton />}>
        <AvailabilityData />
      </Suspense>
    </Section>
  );
}
