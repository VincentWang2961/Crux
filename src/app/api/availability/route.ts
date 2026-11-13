import { connection } from "next/server";
import { getAvailability } from "@/lib/availability";

// Public, read-only: the same two-week window the home page shows.
// The planned admin write endpoint (PUT, bearer token) is documented in AGENTS.md.
export async function GET() {
  await connection();
  return Response.json(await getAvailability(), {
    headers: { "Cache-Control": "no-store" },
  });
}
