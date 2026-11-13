import { connection } from "next/server";
import { isAdmin } from "@/lib/admin-auth";
import { getAvailability, saveAvailabilityDays, validateUpdates } from "@/lib/availability";

// Public, read-only: the same window the hero pill shows.
export async function GET() {
  await connection();
  return Response.json(await getAvailability(), {
    headers: { "Cache-Control": "no-store" },
  });
}

// Admin only (session cookie from /api/admin/login). Body: { days: DayUpdate[] };
// each listed day is replaced whole. See "Availability" in AGENTS.md.
export async function PUT(request: Request) {
  if (!(await isAdmin())) return Response.json({ error: "unauthorised" }, { status: 401 });
  const body = await request.json().catch(() => null);
  const error = validateUpdates(body?.days);
  if (error) return Response.json({ error }, { status: 400 });
  await saveAvailabilityDays(body.days);
  return new Response(null, { status: 204 });
}
