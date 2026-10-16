import "server-only";
import { NextResponse } from "next/server";
import { getSessionUser, type SessionUser } from "@/lib/auth/server";
import { clientKey, createRateLimiter } from "@/lib/rate-limit";

const limiter = createRateLimiter({ limit: 120, windowMs: 60_000 });

/**
 * Checks an account API request: rate limit, then (for writes) same-origin JSON,
 * then a signed-in user. Returns the user, or the response to send instead.
 */
export async function guardAccountRequest(
  req: Request,
  { write }: { write: boolean },
): Promise<SessionUser | NextResponse> {
  if (!limiter(clientKey(req)).ok) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }
  if (write) {
    // CSRF: browsers can't send cross-site JSON without a preflight we never allow,
    // and we also insist the request comes from our own origin.
    const origin = req.headers.get("origin");
    const expected = process.env.AUTH_URL ? new URL(process.env.AUTH_URL).origin : null;
    if (!origin || origin !== expected) {
      return NextResponse.json({ error: "Cross-origin request refused" }, { status: 403 });
    }
    if (!req.headers.get("content-type")?.startsWith("application/json")) {
      return NextResponse.json({ error: "Expected JSON" }, { status: 415 });
    }
  }
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  return user;
}

export async function readJson(req: Request): Promise<unknown> {
  try {
    return await req.json();
  } catch {
    return undefined;
  }
}
