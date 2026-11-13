import { Suspense } from "react";
import { connection } from "next/server";
import { getAvailability } from "@/lib/availability";
import { AvailabilityPill } from "./availability-pill";

// Depends on the current time, so it renders at request time inside Suspense; the rest
// of the hero stays in the static shell.
async function Pill() {
  await connection();
  return <AvailabilityPill data={await getAvailability()} />;
}

export function AvailabilityStatus() {
  return (
    <Suspense fallback={<div aria-hidden className="h-10 w-36 rounded-full border sm:h-8" />}>
      <Pill />
    </Suspense>
  );
}
