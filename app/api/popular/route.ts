import { NextResponse, type NextRequest } from "next/server";
import { popularStreaming } from "@/lib/popular";
import { clientKey, createRateLimiter } from "@/lib/rate-limit";
import { getRegion } from "@/lib/region";
import { reportTmdbError } from "@/lib/tmdb/problem";

const limiter = createRateLimiter({ limit: 30, windowMs: 60_000 });

/** Popular titles on the given providers (`providers=8,337`), for the visitor's region. */
export async function GET(req: NextRequest) {
  if (!limiter(clientKey(req)).ok) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }
  const ids = (req.nextUrl.searchParams.get("providers") ?? "")
    .split(/[,|]/)
    .map(Number)
    .filter((n) => Number.isInteger(n) && n > 0)
    .slice(0, 30);
  if (ids.length === 0) return NextResponse.json({ results: [] });

  try {
    const results = await popularStreaming(await getRegion(), ids);
    return NextResponse.json({ results });
  } catch (err) {
    reportTmdbError(err, "api popular");
    return NextResponse.json({ error: "Unavailable right now" }, { status: 502 });
  }
}
