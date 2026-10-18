import { NextResponse, type NextRequest } from "next/server";
import { streamingFor, titleKeysSchema } from "@/lib/checkup/availability";
import { clientKey, createRateLimiter } from "@/lib/rate-limit";
import { getRegion } from "@/lib/region";
import { isTestMode } from "@/lib/test-mode";
import { reportTmdbError } from "@/lib/tmdb/problem";

const limiter = createRateLimiter({ limit: isTestMode() ? 10_000 : 30, windowMs: 60_000 });

/**
 * Where the visitor's list titles stream in their country, for the service
 * check-up: `?titles=movie:116149,tv:136315`. Nothing is stored or logged.
 */
export async function GET(req: NextRequest) {
  const limit = limiter(clientKey(req));
  if (!limit.ok) {
    return NextResponse.json(
      { error: "Too many requests" },
      { status: 429, headers: { "Retry-After": String(limit.retryAfterSeconds) } },
    );
  }

  const parsed = titleKeysSchema.safeParse(req.nextUrl.searchParams.get("titles") ?? "");
  if (!parsed.success) return NextResponse.json({ error: "Bad titles" }, { status: 400 });

  const region = await getRegion();
  try {
    return NextResponse.json({ region, results: await streamingFor(parsed.data, region) });
  } catch (err) {
    return NextResponse.json(
      { error: reportTmdbError(err, `api availability (${region})`) },
      { status: 502 },
    );
  }
}
