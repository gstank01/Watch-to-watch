import { notFound } from "next/navigation";
import { watchLinkFor, type WatchLink } from "@/lib/availability/links";
import { getFreeServices } from "@/lib/data/free-services";
import { getProviderLinks } from "@/lib/data/provider-links";
import { getRegion } from "@/lib/region";
import { regionInfo } from "@/lib/region-shared";
import { getMovie, getTv, getWatchProviders, TmdbError } from "@/lib/tmdb";
import type { MediaType, RegionProviders } from "@/lib/tmdb/schemas";
import { reportTmdbError } from "@/lib/tmdb/problem";
import { DataProblem } from "./data-problem";
import { Poster } from "./poster";
import { WhereToWatch } from "./where-to-watch";

export function parseId(raw: string) {
  const id = Number(raw);
  return Number.isInteger(id) && id > 0 ? id : null;
}

export type TitleInfo = {
  title: string;
  year: string | null;
  tagline: string | null;
  overview: string;
  posterPath: string | null;
  rating: number | null;
  genres: string[];
  facts: string[];
};

export async function loadTitle(mediaType: MediaType, id: number): Promise<TitleInfo> {
  try {
    if (mediaType === "movie") {
      const m = await getMovie(id);
      return {
        title: m.title,
        year: m.release_date?.slice(0, 4) || null,
        tagline: m.tagline || null,
        overview: m.overview ?? "",
        posterPath: m.poster_path ?? null,
        rating: m.vote_average ?? null,
        genres: m.genres.map((g) => g.name),
        facts: ["Film", m.runtime ? `${m.runtime} min` : null].filter(Boolean) as string[],
      };
    }
    const t = await getTv(id);
    return {
      title: t.name,
      year: t.first_air_date?.slice(0, 4) || null,
      tagline: t.tagline || null,
      overview: t.overview ?? "",
      posterPath: t.poster_path ?? null,
      rating: t.vote_average ?? null,
      genres: t.genres.map((g) => g.name),
      facts: [
        "Series",
        t.number_of_seasons
          ? `${t.number_of_seasons} season${t.number_of_seasons === 1 ? "" : "s"}`
          : null,
        t.episode_run_time[0] ? `${t.episode_run_time[0]} min episodes` : null,
      ].filter(Boolean) as string[],
    };
  } catch (err) {
    if (err instanceof TmdbError && err.status === 404) notFound();
    throw err;
  }
}

async function loadProviders(mediaType: MediaType, id: number, region: string) {
  try {
    return { providers: await getWatchProviders(mediaType, id, region), problem: null };
  } catch (err) {
    const problem = reportTmdbError(err, `watch providers ${mediaType}/${id} (${region})`);
    return { providers: {} as RegionProviders, problem };
  }
}

export async function TitlePage({ mediaType, id }: { mediaType: MediaType; id: number }) {
  const region = await getRegion();
  const [titleResult, { providers, problem }] = await Promise.all([
    loadTitle(mediaType, id).then(
      (info) => ({ info, problem: null }),
      (err: unknown) => {
        // notFound() and other framework signals must keep propagating.
        if (!(err instanceof TmdbError)) throw err;
        return { info: null, problem: reportTmdbError(err, `details ${mediaType}/${id}`) };
      },
    ),
    loadProviders(mediaType, id, region),
  ]);
  const { info } = titleResult;
  if (!info) return <DataProblem message={titleResult.problem ?? ""} />;
  const { name } = regionInfo(region);
  const free = getFreeServices(region);
  const links = getProviderLinks();
  const watchLinks: Record<number, WatchLink> = {};
  for (const type of ["flatrate", "free", "ads", "rent", "buy"] as const) {
    for (const p of providers[type] ?? []) {
      const link = watchLinkFor(links, p.provider_id, region, info.title);
      if (link) watchLinks[p.provider_id] = link;
    }
  }

  return (
    <article className="grid gap-8 md:grid-cols-[240px_1fr]">
      <div className="mx-auto w-48 md:w-full">
        <Poster
          path={info.posterPath}
          title={info.title}
          size="w500"
          sizes="(min-width: 768px) 240px, 192px"
          priority
        />
      </div>
      <div className="space-y-6">
        <header className="space-y-2">
          <h1 className="text-3xl font-bold tracking-tight">
            {info.title}
            {info.year && <span className="text-muted font-normal"> ({info.year})</span>}
          </h1>
          {info.tagline && <p className="text-muted text-lg italic">{info.tagline}</p>}
          <p className="text-muted text-sm">
            {[
              ...info.facts,
              info.genres.join(", ") || null,
              info.rating ? `★ ${info.rating.toFixed(1)}` : null,
            ]
              .filter(Boolean)
              .join(" · ")}
          </p>
        </header>
        {info.overview && <p className="max-w-prose leading-relaxed">{info.overview}</p>}

        {problem ? (
          <DataProblem message={problem} />
        ) : (
          <WhereToWatch
            title={info.title}
            regionName={name}
            providers={providers}
            freeProviderIds={free.map((f) => f.provider_id)}
            freeNotes={Object.fromEntries(free.map((f) => [f.provider_id, f.notes]))}
            watchLinks={watchLinks}
          />
        )}
      </div>
    </article>
  );
}
