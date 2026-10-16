import { NextResponse, type NextRequest } from "next/server";
import { clientKey, createRateLimiter } from "@/lib/rate-limit";
import { getRegion } from "@/lib/region";
import { searchTitles } from "@/lib/tmdb";

const limiter = createRateLimiter({ limit: 60, windowMs: 60_000 });

/** Autocomplete: top 8 films/shows for `q`. */
export async function GET(req: NextRequest) {
  const limit = limiter(clientKey(req));
  if (!limit.ok) {
    return NextResponse.json(
      { error: "Too many requests" },
      { status: 429, headers: { "Retry-After": String(limit.retryAfterSeconds) } },
    );
  }

  const q = req.nextUrl.searchParams.get("q")?.trim() ?? "";
  if (q.length < 2 || q.length > 100) return NextResponse.json({ results: [] });

  try {
    const region = await getRegion();
    const { results } = await searchTitles(q, region);
    return NextResponse.json({
      results: results.slice(0, 8).map(({ id, mediaType, title, year, posterPath }) => ({
        id,
        mediaType,
        title,
        year,
        posterPath,
      })),
    });
  } catch {
    return NextResponse.json({ error: "Search is unavailable right now" }, { status: 502 });
  }
}
