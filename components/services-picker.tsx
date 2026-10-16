"use client";

import { useMemo, useState } from "react";
import { toggleService, useMyServices, writeServices } from "@/lib/services/store";
import type { ProviderInfo } from "@/lib/tmdb/types";
import { ProviderLogo } from "./provider-logo";

export function ServicesPicker({
  providers,
  freeProviderIds,
}: {
  providers: ProviderInfo[];
  freeProviderIds: number[];
}) {
  const selected = useMyServices();
  const [filter, setFilter] = useState("");
  const free = useMemo(() => new Set(freeProviderIds), [freeProviderIds]);

  const visible = useMemo(() => {
    const f = filter.trim().toLowerCase();
    return f ? providers.filter((p) => p.name.toLowerCase().includes(f)) : providers;
  }, [filter, providers]);

  const chosen = selected ?? [];
  const chosenProviders = providers.filter((p) => chosen.includes(p.id));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <label className="flex-1">
          <span className="sr-only">Filter services</span>
          <input
            type="search"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            placeholder="Find a service…"
            className="border-border bg-surface w-full rounded-xl border px-4 py-2"
          />
        </label>
        {chosen.length > 0 && (
          <button
            type="button"
            onClick={() => writeServices([])}
            className="border-border rounded-lg border px-3 py-2 text-sm"
          >
            Clear all
          </button>
        )}
      </div>

      <p aria-live="polite" className="text-muted text-sm">
        {selected === null
          ? "Loading your services…"
          : chosenProviders.length
            ? `Selected: ${chosenProviders.map((p) => p.name).join(", ")}`
            : "No services selected yet."}
      </p>

      <ul
        className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3"
        aria-label="Streaming services"
      >
        {visible.map((p) => {
          const on = chosen.includes(p.id);
          return (
            <li key={p.id}>
              <label
                className={`flex cursor-pointer items-center gap-3 rounded-xl border p-3 ${
                  on
                    ? "border-accent bg-accent-soft"
                    : "border-border bg-surface hover:bg-surface-2"
                }`}
              >
                <input
                  type="checkbox"
                  checked={on}
                  disabled={selected === null}
                  onChange={() => toggleService(chosen, p.id)}
                  className="size-5 accent-[var(--accent)]"
                />
                <ProviderLogo path={p.logoPath} name={p.name} size={36} />
                <span className="flex-1 font-medium">{p.name}</span>
                {free.has(p.id) && (
                  <span className="bg-free-soft text-free rounded-full px-2 py-0.5 text-xs font-medium">
                    Free
                  </span>
                )}
              </label>
            </li>
          );
        })}
      </ul>
      {visible.length === 0 && <p className="text-muted">No services match “{filter}”.</p>}
    </div>
  );
}
