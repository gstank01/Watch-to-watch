"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useMyServices } from "@/lib/services/store";
import type { TitleSummary } from "@/lib/tmdb/types";
import { TitleGrid } from "./title-grid";

/** "Pick your services" prompt, or popular titles on the visitor's services. */
export function HomePersonal() {
  const services = useMyServices();
  const key =
    services
      ?.slice()
      .sort((a, b) => a - b)
      .join(",") ?? "";
  const [state, setState] = useState<{ key: string; titles: TitleSummary[] } | null>(null);

  useEffect(() => {
    if (!key) return;
    const controller = new AbortController();
    fetch(`/api/popular?providers=${key}`, { signal: controller.signal })
      .then((res) => (res.ok ? res.json() : { results: [] }))
      .then((body: { results: TitleSummary[] }) => setState({ key, titles: body.results }))
      .catch(() => {});
    return () => controller.abort();
  }, [key]);

  if (services === null) return null;

  if (services.length === 0) {
    return (
      <section className="border-accent bg-accent-soft flex flex-wrap items-center justify-between gap-4 rounded-xl border p-5">
        <div>
          <h2 className="text-lg font-semibold">Which services do you already have?</h2>
          <p className="text-muted">
            Tick them once and we&apos;ll show what&apos;s on them first. Saved in this browser
            only.
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

  const titles = state?.key === key ? state.titles : null;
  return (
    <section aria-labelledby="on-my-services" className="space-y-4">
      <div className="flex items-baseline justify-between">
        <h2 id="on-my-services" className="text-xl font-semibold">
          Popular on your services
        </h2>
        <Link href="/services" className="text-accent text-sm underline">
          Edit services
        </Link>
      </div>
      {titles === null ? (
        <p className="text-muted">Loading…</p>
      ) : titles.length ? (
        <TitleGrid titles={titles} label="Popular on your services" />
      ) : (
        <p className="text-muted">Nothing to show for your services right now.</p>
      )}
    </section>
  );
}
