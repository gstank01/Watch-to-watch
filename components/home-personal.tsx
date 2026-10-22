"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { libraryKey } from "@/lib/library/model";
import { useLibrary } from "@/lib/library/store";
import { useMyServices } from "@/lib/services/store";
import type { TitleSummary } from "@/lib/tmdb/types";
import { ProviderLogo } from "./provider-logo";
import { TitleRow } from "./title-grid";

type ServiceRow = { id: number; name: string; logoPath: string | null; titles: TitleSummary[] };

/** "Pick your services" prompt, or a "Popular on <service>" row for each of the visitor's services. */
export function HomePersonal() {
  const services = useMyServices();
  const library = useLibrary();
  // In the order the visitor ticked them.
  const key = services?.join(",") ?? "";
  const [state, setState] = useState<{ key: string; rows: ServiceRow[] | null } | null>(null);

  useEffect(() => {
    if (!key) return;
    const controller = new AbortController();
    fetch(`/api/popular?providers=${key}&by=service`, { signal: controller.signal })
      .then((res) => (res.ok ? res.json() : Promise.reject(new Error(`HTTP ${res.status}`))))
      .then((body: { services: ServiceRow[] }) => setState({ key, rows: body.services }))
      .catch(() => {
        if (!controller.signal.aborted) setState({ key, rows: null });
      });
    return () => controller.abort();
  }, [key]);

  if (services === null) return null;

  if (services.length === 0) {
    return (
      <section className="border-accent bg-accent-soft flex flex-wrap items-center justify-between gap-4 rounded-xl border p-5">
        <div>
          <h2 className="text-lg font-semibold">Which services do you already have?</h2>
          <p className="text-muted">
            Tick them once and we&apos;ll show what&apos;s popular on each of them, and put them
            first everywhere.
          </p>
        </div>
        <Link
          href="/services"
          className="bg-accent text-accent-fg rounded-lg px-4 py-2 font-medium hover:opacity-90"
        >
          Pick my services
        </Link>
      </section>
    );
  }

  const loaded = state?.key === key ? state : null;
  // Leave out what the visitor has already watched.
  const unwatched = (titles: TitleSummary[]) =>
    titles.filter((t) => library?.[libraryKey(t)]?.status !== "watched");

  return (
    <section aria-labelledby="on-my-services" className="space-y-6">
      <div className="flex items-baseline justify-between">
        <h2 id="on-my-services" className="text-xl font-semibold">
          Popular on your services
        </h2>
        <Link href="/services" className="text-accent text-sm underline">
          Edit services
        </Link>
      </div>
      {loaded === null ? (
        <p className="text-muted">Loading…</p>
      ) : loaded.rows === null ? (
        <p className="text-muted">We couldn&apos;t load what&apos;s popular right now.</p>
      ) : (
        loaded.rows.map((row) => {
          const titles = unwatched(row.titles);
          return (
            <section key={row.id} aria-labelledby={`popular-on-${row.id}`} className="space-y-3">
              <h3
                id={`popular-on-${row.id}`}
                className="flex items-center gap-2 text-lg font-semibold"
              >
                <ProviderLogo path={row.logoPath} name={row.name} size={28} />
                Popular on {row.name}
              </h3>
              {titles.length ? (
                <TitleRow titles={titles} label={`Popular on ${row.name}`} />
              ) : (
                <p className="text-muted text-sm">Nothing new to show on {row.name} right now.</p>
              )}
            </section>
          );
        })
      )}
      <p className="text-muted text-xs">
        Ranked by popularity on TMDB in recent days: a guide to what people are watching, not the
        services&apos; own viewing figures.
      </p>
    </section>
  );
}
