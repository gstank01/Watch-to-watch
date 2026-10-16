import Link from "next/link";
import type { TitleSummary } from "@/lib/tmdb/types";
import { Poster } from "./poster";

export function titleHref(t: Pick<TitleSummary, "id" | "mediaType">) {
  return `/${t.mediaType}/${t.id}`;
}

type CardTitle = Pick<TitleSummary, "id" | "mediaType" | "title" | "year" | "posterPath"> & {
  rating?: number | null;
};

export function TitleCard({ title, children }: { title: CardTitle; children?: React.ReactNode }) {
  return (
    <li>
      <Link href={titleHref(title)} className="group block rounded-lg">
        <Poster
          path={title.posterPath}
          title={title.title}
          sizes="(min-width: 1024px) 180px, (min-width: 640px) 25vw, 45vw"
        />
        <p className="mt-2 leading-tight font-medium group-hover:underline">{title.title}</p>
        <p className="text-muted text-sm">
          {title.mediaType === "tv" ? "Series" : "Film"}
          {title.year ? ` · ${title.year}` : ""}
          {title.rating ? ` · ★ ${title.rating.toFixed(1)}` : ""}
        </p>
      </Link>
      {children}
    </li>
  );
}

export function TitleGrid({ titles, label }: { titles: TitleSummary[]; label?: string }) {
  return (
    <ul
      aria-label={label}
      className="grid grid-cols-2 gap-x-4 gap-y-6 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6"
    >
      {titles.map((t) => (
        <TitleCard key={`${t.mediaType}-${t.id}`} title={t} />
      ))}
    </ul>
  );
}
