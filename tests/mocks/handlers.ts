import { http, HttpResponse, type HttpResponseResolver } from "msw";
import {
  DISCOVER_MOVIES,
  DISCOVER_TV,
  GENRES,
  MOVIES,
  PROVIDER_LIST,
  SEARCHABLE,
  STREAMS_ON,
  TV,
  WATCH_PROVIDERS,
} from "./fixtures";

const page = <T>(results: T[]) => ({
  page: 1,
  results,
  total_pages: 1,
  total_results: results.length,
});

const notFound = () =>
  HttpResponse.json(
    {
      success: false,
      status_code: 34,
      status_message: "The resource you requested could not be found.",
    },
    { status: 404 },
  );

/** Every handler requires a bearer token, like the real API. */
function authed(resolver: HttpResponseResolver): HttpResponseResolver {
  return (info) => {
    if (!info.request.headers.get("authorization")?.startsWith("Bearer ")) {
      return HttpResponse.json(
        { status_code: 7, status_message: "Invalid API key" },
        { status: 401 },
      );
    }
    return resolver(info);
  };
}

function discoverResolver(type: "movie" | "tv"): HttpResponseResolver {
  return ({ request }) => {
    const url = new URL(request.url);
    const providers = url.searchParams.get("with_watch_providers");
    let results: { id: number }[] = type === "movie" ? DISCOVER_MOVIES : DISCOVER_TV;
    if (providers) {
      const wanted = providers.split("|").map(Number);
      results = results.filter((r) =>
        (STREAMS_ON[`${type}/${r.id}`] ?? []).some((id) => wanted.includes(id)),
      );
    }
    return HttpResponse.json(page(results));
  };
}

export const handlers = [
  http.get(
    "*/search/multi",
    authed(({ request }) => {
      const q = (new URL(request.url).searchParams.get("query") ?? "").toLowerCase();
      const results = SEARCHABLE.filter((r) =>
        ("title" in r ? r.title : r.name).toLowerCase().includes(q),
      );
      return HttpResponse.json(page(results));
    }),
  ),
  http.get(
    "*/movie/:id/watch/providers",
    authed(({ params }) =>
      HttpResponse.json(
        WATCH_PROVIDERS[`movie/${params.id}`] ?? { id: Number(params.id), results: {} },
      ),
    ),
  ),
  http.get(
    "*/tv/:id/watch/providers",
    authed(({ params }) =>
      HttpResponse.json(
        WATCH_PROVIDERS[`tv/${params.id}`] ?? { id: Number(params.id), results: {} },
      ),
    ),
  ),
  http.get(
    "*/movie/:id",
    authed(({ params }) => {
      const m = MOVIES[Number(params.id)];
      return m ? HttpResponse.json(m) : notFound();
    }),
  ),
  http.get(
    "*/tv/:id",
    authed(({ params }) => {
      const t = TV[Number(params.id)];
      return t ? HttpResponse.json(t) : notFound();
    }),
  ),
  http.get(
    "*/watch/providers/movie",
    authed(() => HttpResponse.json({ results: PROVIDER_LIST.movie })),
  ),
  http.get(
    "*/watch/providers/tv",
    authed(() => HttpResponse.json({ results: PROVIDER_LIST.tv })),
  ),
  http.get(
    "*/genre/movie/list",
    authed(() => HttpResponse.json({ genres: GENRES.movie })),
  ),
  http.get(
    "*/genre/tv/list",
    authed(() => HttpResponse.json({ genres: GENRES.tv })),
  ),
  http.get("*/discover/movie", authed(discoverResolver("movie"))),
  http.get("*/discover/tv", authed(discoverResolver("tv"))),
];
