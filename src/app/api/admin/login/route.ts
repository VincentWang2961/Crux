import { cookies, headers } from "next/headers";
import {
  SESSION_COOKIE,
  SESSION_TTL_S,
  adminConfigured,
  clearFailures,
  createSession,
  isRateLimited,
  passwordMatches,
  recordFailure,
} from "@/lib/admin-auth";

async function clientKey() {
  const h = await headers();
  return h.get("x-forwarded-for")?.split(",")[0].trim() || h.get("x-real-ip") || "local";
}

// POST { password } → 204 + httpOnly session cookie, 401 wrong password, 429 too many tries.
export async function POST(request: Request) {
  if (!adminConfigured()) return Response.json({ error: "admin not configured" }, { status: 503 });
  const client = await clientKey();
  if (isRateLimited(client)) return Response.json({ error: "too many attempts" }, { status: 429 });

  const body = await request.json().catch(() => null);
  const password = typeof body?.password === "string" ? body.password.slice(0, 200) : "";
  if (!passwordMatches(password)) {
    recordFailure(client);
    return Response.json({ error: "no" }, { status: 401 });
  }

  clearFailures(client);
  (await cookies()).set(SESSION_COOKIE, createSession(), {
    httpOnly: true,
    sameSite: "strict",
    // Secure whenever the site is reached over HTTPS (directly or behind a proxy).
    secure:
      new URL(request.url).protocol === "https:" ||
      (await headers()).get("x-forwarded-proto") === "https",
    path: "/",
    maxAge: SESSION_TTL_S,
  });
  return new Response(null, { status: 204 });
}

// DELETE → log out.
export async function DELETE() {
  (await cookies()).delete(SESSION_COOKIE);
  return new Response(null, { status: 204 });
}
