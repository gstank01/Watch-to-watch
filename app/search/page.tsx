import type { Metadata } from "next";
import { DataProblem } from "@/components/data-problem";
import { SearchBox } from "@/components/search-box";
import { TitleGrid } from "@/components/title-grid";
import { getRegion } from "@/lib/region";
import { searchTitles } from "@/lib/tmdb";
import { reportTmdbError } from "@/lib/tmdb/problem";
import type { TitleSummary } from "@/lib/tmdb/types";

export async function generateMetadata(props: PageProps<"/search">): Promise<Metadata> {
  const q = (await props.searchParams).q;
  return { title: typeof q === "string" && q ? `Search: ${q}` : "Search" };
}

export default async function SearchPage(props: PageProps<"/search">) {
  const raw = (await props.searchParams).q;
  const q = (typeof raw === "string" ? raw : "").trim().slice(0, 100);
  const region = await getRegion();

  let results: TitleSummary[] | null = null;
  let problem: string | null = null;
  if (q) {
    try {
      results = (await searchTitles(q, region)).results;
    } catch (err) {
      problem = reportTmdbError(err, "search page");
    }
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">{q ? `Results for “${q}”` : "Search"}</h1>
      <div className="max-w-2xl">
        <SearchBox key={q} defaultValue={q} size="md" autoFocus={!q} />
      </div>
      {problem && <DataProblem message={problem} />}
      {results &&
        (results.length ? (
          <TitleGrid titles={results} label={`Results for ${q}`} />
        ) : (
          <p className="text-muted">No films or shows found for “{q}”.</p>
        ))}
    </div>
  );
}
