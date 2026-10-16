import { DataProblem } from "@/components/data-problem";
import { HomePersonal } from "@/components/home-personal";
import { SearchBox } from "@/components/search-box";
import { TitleGrid } from "@/components/title-grid";
import { popularStreaming } from "@/lib/popular";
import { getRegion } from "@/lib/region";
import { regionInfo } from "@/lib/region-shared";
import { reportTmdbError } from "@/lib/tmdb/problem";

async function loadPopular(region: string) {
  try {
    return { titles: await popularStreaming(region), problem: null };
  } catch (err) {
    return { titles: null, problem: reportTmdbError(err, `home popular (${region})`) };
  }
}

export default async function Home() {
  const region = await getRegion();
  const { titles: popular, problem } = await loadPopular(region);
  const { name } = regionInfo(region);

  return (
    <div className="space-y-10">
      <section className="space-y-4 py-4 text-center sm:py-10">
        <h1 className="text-3xl font-bold tracking-tight sm:text-5xl">Find something to watch.</h1>
        <p className="text-muted mx-auto max-w-xl text-lg">
          Every streaming service in one search. What&apos;s on your services and what&apos;s free
          comes first.
        </p>
        <div className="mx-auto max-w-2xl text-left">
          <SearchBox autoFocus />
        </div>
      </section>

      <HomePersonal />

      <section aria-labelledby="popular" className="space-y-4">
        <h2 id="popular" className="text-xl font-semibold">
          Popular to stream in {name}
        </h2>
        {popular ? (
          <TitleGrid titles={popular} label={`Popular to stream in ${name}`} />
        ) : (
          <DataProblem message={problem ?? ""} />
        )}
      </section>
    </div>
  );
}
