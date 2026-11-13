// Admin auth for the availability editor. Server-only (node:crypto, cookies).
//
// - The password lives in the ADMIN_PASSWORD env var (never in the repo or the client).
// - A successful login sets an httpOnly cookie "<expiry>.<hmac(expiry)>" signed with
//   ADMIN_SESSION_SECRET; every admin page and write API re-verifies it.
// - Failed logins are rate-limited per client in memory.

import { createHash, createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";

export const SESSION_COOKIE = "crux_admin";
export const SESSION_TTL_S = 60 * 60 * 12; // 12 h

const sha256 = (s: string) => createHash("sha256").update(s).digest();

function secret(): string | null {
  const s = process.env.ADMIN_SESSION_SECRET;
  return s && s.length >= 32 ? s : null;
}

export const adminConfigured = () => Boolean(process.env.ADMIN_PASSWORD && secret());

/**
 * Constant-time comparison (hashing first makes the lengths equal). Both sides are
 * NFKC-normalised, so full-width characters from a CJK input method ("！", "＠") match
 * their ASCII forms.
 */
export function passwordMatches(input: string): boolean {
  const expected = process.env.ADMIN_PASSWORD;
  if (!expected) return false;
  return timingSafeEqual(sha256(input.normalize("NFKC")), sha256(expected.normalize("NFKC")));
}

const sign = (payload: string, key: string) =>
  createHmac("sha256", key).update(payload).digest("base64url");

export function createSession(): string {
  const key = secret();
  if (!key) throw new Error("ADMIN_SESSION_SECRET is not set (min. 32 characters)");
  const exp = String(Math.floor(Date.now() / 1000) + SESSION_TTL_S);
  return `${exp}.${sign(exp, key)}`;
}

export function verifySession(value: string | undefined): boolean {
  const key = secret();
  if (!key || !value) return false;
  const [exp, sig] = value.split(".");
  if (!exp || !sig) return false;
  const expected = Buffer.from(sign(exp, key));
  const given = Buffer.from(sig);
  if (expected.length !== given.length || !timingSafeEqual(expected, given)) return false;
  return Number(exp) > Date.now() / 1000;
}

/** For Server Components and Route Handlers. */
export async function isAdmin(): Promise<boolean> {
  return verifySession((await cookies()).get(SESSION_COOKIE)?.value);
}

// ---- Failed-login rate limit (per client, in memory; resets on restart) ----------

const WINDOW_MS = 10 * 60 * 1000;
// The hero submits whenever typing pauses, so one real attempt can cost several failures.
const MAX_FAILURES = 60;
const failures = new Map<string, { count: number; reset: number }>();

export function isRateLimited(client: string): boolean {
  const entry = failures.get(client);
  if (!entry || entry.reset < Date.now()) return false;
  return entry.count >= MAX_FAILURES;
}

export function recordFailure(client: string) {
  const now = Date.now();
  const entry = failures.get(client);
  if (!entry || entry.reset < now) failures.set(client, { count: 1, reset: now + WINDOW_MS });
  else entry.count++;
}

export function clearFailures(client: string) {
  failures.delete(client);
}
