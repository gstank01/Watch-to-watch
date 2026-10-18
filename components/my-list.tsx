"use client";

import Link from "next/link";
import { useState } from "react";
import { LISTS, listCounts, titlesIn, type ListKey } from "@/lib/library/model";
import { useLibrary } from "@/lib/library/store";
import { StarRating } from "./star-rating";
import { TitleActions } from "./title-actions";
import { TitleCard } from "./title-grid";

const EMPTY: Record<ListKey, string> = {
  want: "Nothing here yet. Open any film or show and choose “Want to watch”.",
  watching: "Nothing here yet. Open what you're watching and choose “Watching”.",
  watched: "Nothing here yet. When you finish something, choose “Watched”.",
  favourites: "No favourites yet. Open any film or show and tap ♥ Favourite.",
};

export function MyList({ list }: { list: ListKey }) {
  const lib = useLibrary();
  const [message, setMessage] = useState("");
  const counts = lib ? listCounts(lib) : null;
  const items = lib ? titlesIn(lib, list) : [];
  const label = LISTS.find((l) => l.key === list)?.label ?? "";

  return (
    <div className="space-y-6">
      <nav aria-label="My lists">
        <ul className="flex flex-wrap gap-2">
          {LISTS.map((l) => {
            const current = l.key === list;
            return (
              <li key={l.key}>
                <Link
                  href={`/my-list?list=${l.key}`}
                  aria-current={current ? "page" : undefined}
                  className={`inline-block rounded-full border px-4 py-1.5 text-sm font-medium ${
                    current
                      ? "border-accent bg-accent text-accent-fg"
                      : "border-border bg-surface hover:bg-surface-2"
                  }`}
                >
                  {l.label}
                  {counts && <span className="opacity-80"> ({counts[l.key]})</span>}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      <p aria-live="polite" className="text-muted min-h-5 text-sm">
        {message}
      </p>

      {lib === null ? (
        <p className="text-muted">Loading your list…</p>
      ) : items.length === 0 ? (
        <p className="border-border bg-surface text-muted rounded-xl border p-5">{EMPTY[list]}</p>
      ) : (
        <ul
          aria-label={label}
          className="grid grid-cols-2 gap-x-4 gap-y-8 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5"
        >
          {items.map((entry) => (
            // The card's rating slot is for TMDB's score; your own stars sit below it.
            <TitleCard key={`${entry.mediaType}-${entry.id}`} title={{ ...entry, rating: null }}>
              <div className="mt-2">
                <TitleActions title={entry} compact onAnnounce={setMessage} />
                <div className="mt-2">
                  <StarRating title={entry} compact onAnnounce={setMessage} />
                </div>
              </div>
            </TitleCard>
          ))}
        </ul>
      )}
    </div>
  );
}
