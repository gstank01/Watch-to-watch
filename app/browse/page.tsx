import type { Metadata } from "next";
import Link from "next/link";
import { ChipGroup } from "@/components/browse-chips";
import { BrowseMineLink } from "@/components/browse-mine-link";
import { DataProblem } from "@/components/data-problem";
import { TitleGrid } from "@/components/title-grid";
import { browseHref, MAX_PAGE, parseBrowse, SORTS, WHERE, type SortKey } from "@/lib/browse";
import { getFreeProviderIds } from "@/lib/data/free-services";
import { getRegion } from "@/lib/region";
import { regionInfo } from "@/lib/region-shared";
import { discover, getGenres } from "@/lib/tmdb";
import { reportTmdbError } from "@/lib/tmdb/problem";
import type { Genre } from "@/lib/tmdb/schemas";
import type { TitleSummary } from "@/lib/tmdb/types";

export const metadata: Metadata = { title: "Browse" };

const STREAMING = ["flatrate", "free", "ads"];

export default async function BrowsePage(props: PageProps<"/browse">) {
  const state = parseBrowse(await props.searchParams);
  const region = await getRegion();
  const { name: regionName } = regionInfo(region);
  const other = state.type === "movie" ? "tv" : "movie";

  let genres: Genre[] = [];
  let otherGenres: Genre[] = [];
  let results: { titles: TitleSummary[]; totalPages: number } | null = null;
  let problem: string | null = null;
  const needsServices = state.where === "mine" && state.services.length === 0;

  try {
    [genres, otherGenres] = await Promise.all([getGenres(state.type), getGenres(other)]);
    if (!needsServices) {
      const found = await discover(state.type, {
        region,
        monetization: STREAMING,
        providerIds:
          state.where === "mine"
            ? state.services
            : state.where === "free"
              ? getFreeProviderIds(region)
              : undefined,
        genreIds: state.genre === null ? undefined : [state.genre],
        sortBy: SORTS[state.sort][state.type],
        // Without a minimum, "top rated" is full of titles with a handful of votes.
        minVotes: state.sort === "top" ? 200 : undefined,
        page: state.page,
      });
      results = { titles: found.results, totalPages: Math.min(found.totalPages, MAX_PAGE) };
    }
  } catch (err) {
    problem = reportTmdbError(err, `browse (${region})`);
  }

  const genreName = genres.find((g) => g.id === state.genre)?.name ?? null;
  const kind = state.type === "movie" ? "films" : "series";
  const heading = [
    genreName ? `${genreName} ${kind}` : kind[0].toUpperCase() + kind.slice(1),
    state.where === "mine" ? "on your services" : state.where === "free" ? "free to watch" : null,
    `in ${regionName}`,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <h1 className="text-2xl font-bold">Browse</h1>
        <p className="text-muted max-w-prose">
          Pick a category and see what&apos;s streaming, on your services or free.
        </p>
      </header>

      <nav aria-label="Browse filters" className="space-y-4">
        <ChipGroup
          label="Films or series"
          options={(["movie", "tv"] as const).map((type) => ({
            key: type,
            label: type === "movie" ? "Films" : "Series",
            active: state.type === type,
            // Keep the category only if the other list has it too (Comedy does; Action differs).
            href: browseHref(state, {
              type,
              genre:
                type === state.type || otherGenres.some((g) => g.id === state.genre)
                  ? state.genre
                  : null,
            }),
          }))}
        />
        {genres.length > 0 && (
          <ChipGroup
            label="Category"
            options={[
              {
                key: "all",
                label: "All",
                active: state.genre === null,
                href: browseHref(state, { genre: null }),
              },
              ...genres.map((g) => ({
                key: String(g.id),
                label: g.name,
                active: state.genre === g.id,
                href: browseHref(state, { genre: g.id }),
              })),
            ]}
          />
        )}
        <ChipGroup
          label="Where"
          options={(["all", "free"] as const).map((where) => ({
            key: where,
            label: WHERE[where],
            active: state.where === where,
            href: browseHref(state, { where }),
          }))}
          extra={<BrowseMineLink state={state} />}
        />
        <ChipGroup
          label="Sort by"
          options={(Object.keys(SORTS) as SortKey[]).map((sort) => ({
            key: sort,
            label: SORTS[sort].label,
            active: state.sort === sort,
            href: browseHref(state, { sort }),
          }))}
        />
      </nav>

      <section aria-labelledby="browse-results" className="space-y-4">
        <h2 id="browse-results" className="text-xl font-semibold">
          {heading}
        </h2>
        {problem ? (
          <DataProblem message={problem} />
        ) : needsServices ? (
          <p className="border-border bg-surface rounded-xl border p-4">
            Choose &ldquo;{WHERE.mine}&rdquo; above to use the services saved in this browser, or{" "}
            <Link className="text-accent underline" href="/services">
              pick your services
            </Link>{" "}
            first.
          </p>
        ) : results && results.titles.length ? (
          <>
            <TitleGrid titles={results.titles} label={heading} />
            <nav aria-label="Pages" className="flex items-center justify-between gap-4 text-sm">
              {state.page > 1 ? (
                <Link
                  className="text-accent underline"
                  href={browseHref(state, { page: state.page - 1 })}
                >
                  Previous page
                </Link>
              ) : (
                <span />
              )}
              <span className="text-muted">
                Page {state.page} of {results.totalPages}
              </span>
              {state.page < results.totalPages ? (
                <Link
                  className="text-accent underline"
                  href={browseHref(state, { page: state.page + 1 })}
                >
                  Next page
                </Link>
              ) : (
                <span />
              )}
            </nav>
          </>
        ) : (
          <p className="text-muted">
            Nothing matches these filters right now. Try another category.
          </p>
        )}
      </section>
    </div>
  );
}
