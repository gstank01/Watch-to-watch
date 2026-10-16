"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useId, useRef, useState } from "react";
import { posterUrl } from "@/lib/tmdb/images";
import type { TitleSummary } from "@/lib/tmdb/types";

type Suggestion = Pick<TitleSummary, "id" | "mediaType" | "title" | "year" | "posterPath">;

const DEBOUNCE_MS = 250;

/** Search input with accessible autocomplete (ARIA 1.2 combobox pattern). */
export function SearchBox({
  defaultValue = "",
  autoFocus,
  size = "lg",
}: {
  defaultValue?: string;
  autoFocus?: boolean;
  size?: "lg" | "md";
}) {
  const router = useRouter();
  const id = useId();
  const listId = `${id}-list`;
  const [query, setQuery] = useState(defaultValue);
  const [results, setResults] = useState<Suggestion[]>([]);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const blurTimer = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) return;
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(q)}`, {
          signal: controller.signal,
        });
        if (!res.ok) return;
        const body = (await res.json()) as { results: Suggestion[] };
        setResults(body.results);
        setActive(-1);
        setOpen(true);
      } catch {
        // Aborted or offline: keep the previous suggestions.
      }
    }, DEBOUNCE_MS);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [query]);

  const showList = open && query.trim().length >= 2 && results.length > 0;

  function go(s: Suggestion) {
    setOpen(false);
    router.push(`/${s.mediaType}/${s.id}`);
  }

  return (
    <form
      role="search"
      action="/search"
      className="relative w-full"
      onSubmit={(e) => {
        e.preventDefault();
        if (showList && active >= 0) return go(results[active]);
        const q = query.trim();
        if (q) {
          setOpen(false);
          router.push(`/search?q=${encodeURIComponent(q)}`);
        }
      }}
    >
      <label htmlFor={`${id}-input`} className="sr-only">
        Search films and TV shows
      </label>
      <div className="flex gap-2">
        <input
          id={`${id}-input`}
          name="q"
          type="search"
          role="combobox"
          aria-expanded={showList}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-activedescendant={showList && active >= 0 ? `${id}-opt-${active}` : undefined}
          autoComplete="off"
          autoFocus={autoFocus}
          placeholder="Search for a film or TV show…"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            if (e.target.value.trim().length < 2) setResults([]);
          }}
          onFocus={() => setOpen(true)}
          onBlur={() => {
            blurTimer.current = setTimeout(() => setOpen(false), 150);
          }}
          onKeyDown={(e) => {
            if (!showList) return;
            if (e.key === "ArrowDown") {
              e.preventDefault();
              setActive((i) => (i + 1) % results.length);
            } else if (e.key === "ArrowUp") {
              e.preventDefault();
              setActive((i) => (i <= 0 ? results.length - 1 : i - 1));
            } else if (e.key === "Escape") {
              setOpen(false);
            }
          }}
          className={`border-border bg-surface placeholder:text-muted w-full rounded-xl border px-4 shadow-sm ${
            size === "lg" ? "py-3 text-lg" : "py-2"
          }`}
        />
        <button
          type="submit"
          className="bg-accent text-accent-fg rounded-xl px-4 font-medium hover:opacity-90"
        >
          Search
        </button>
      </div>
      <ul
        id={listId}
        role="listbox"
        aria-label="Suggestions"
        hidden={!showList}
        className="border-border bg-surface absolute z-20 mt-2 w-full overflow-hidden rounded-xl border shadow-lg"
      >
        {results.map((s, i) => {
          const src = posterUrl(s.posterPath, "w92");
          return (
            <li
              key={`${s.mediaType}-${s.id}`}
              id={`${id}-opt-${i}`}
              role="option"
              aria-selected={i === active}
              className={`flex cursor-pointer items-center gap-3 px-3 py-2 ${
                i === active ? "bg-accent-soft" : "hover:bg-surface-2"
              }`}
              onMouseDown={(e) => {
                // Keep focus so blur doesn't close the list before the click lands.
                e.preventDefault();
                clearTimeout(blurTimer.current);
              }}
              onClick={() => go(s)}
            >
              <span className="bg-surface-2 relative h-12 w-8 shrink-0 overflow-hidden rounded">
                {src && <Image src={src} alt="" fill sizes="32px" className="object-cover" />}
              </span>
              <span>
                <span className="block font-medium">{s.title}</span>
                <span className="text-muted block text-sm">
                  {s.mediaType === "tv" ? "Series" : "Film"}
                  {s.year ? ` · ${s.year}` : ""}
                </span>
              </span>
            </li>
          );
        })}
      </ul>
    </form>
  );
}
