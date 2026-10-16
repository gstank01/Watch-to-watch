"use client";

import Link from "next/link";
import { groupProviders, type GroupedProvider, type ProviderGroup } from "@/lib/availability/group";
import { useMyServices } from "@/lib/services/store";
import type { MonetizationType, RegionProviders } from "@/lib/tmdb/schemas";
import { ProviderLogo } from "./provider-logo";

const OFFER_LABELS: Record<MonetizationType, string> = {
  flatrate: "Subscription",
  free: "Free",
  ads: "Free with ads",
  rent: "Rent",
  buy: "Buy",
};

type Props = {
  title: string;
  regionName: string;
  providers: RegionProviders;
  freeProviderIds: number[];
  freeNotes: Record<number, string>;
};

export function WhereToWatch({ title, regionName, providers, freeProviderIds, freeNotes }: Props) {
  const services = useMyServices();
  const groups = groupProviders({
    providers,
    userServices: services ?? [],
    freeProviderIds,
  });
  const link = providers.link ?? null;

  return (
    <section aria-labelledby="where-to-watch" className="space-y-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 id="where-to-watch" className="text-xl font-semibold">
          Where to watch in {regionName}
        </h2>
        <Link href="/services" className="text-accent text-sm underline">
          {services?.length ? "Edit my services" : "Pick my services"}
        </Link>
      </div>

      {groups.length === 0 ? (
        <p className="border-border bg-surface text-muted rounded-lg border p-4">
          We couldn&apos;t find anywhere streaming this in {regionName} right now.
        </p>
      ) : (
        groups.map((group) =>
          group.key === "rentBuy" ? (
            <details
              key={group.key}
              className="border-border bg-surface rounded-xl border"
              data-group={group.key}
            >
              <summary className="cursor-pointer px-4 py-3 font-medium">
                {group.label} ({group.providers.length})
              </summary>
              <ProviderList
                group={group}
                title={title}
                link={link}
                freeNotes={freeNotes}
                freeIds={freeProviderIds}
              />
            </details>
          ) : (
            <div
              key={group.key}
              data-group={group.key}
              className={`rounded-xl border ${
                group.key === "mine"
                  ? "border-accent bg-accent-soft"
                  : group.key === "free"
                    ? "border-free/40 bg-free-soft"
                    : "border-border bg-surface"
              }`}
            >
              <h3 className="px-4 pt-3 font-medium">{group.label}</h3>
              <ProviderList
                group={group}
                title={title}
                link={link}
                freeNotes={freeNotes}
                freeIds={freeProviderIds}
              />
            </div>
          ),
        )
      )}

      <p className="text-muted text-xs">
        Availability from{" "}
        <a className="underline" href="https://www.justwatch.com/" rel="noopener noreferrer">
          JustWatch
        </a>{" "}
        via TMDB. It can take a day or two to catch up with changes.
      </p>
    </section>
  );
}

function ProviderList({
  group,
  title,
  link,
  freeNotes,
  freeIds,
}: {
  group: ProviderGroup;
  title: string;
  link: string | null;
  freeNotes: Record<number, string>;
  freeIds: number[];
}) {
  return (
    <ul className="divide-border divide-y px-4 pb-1">
      {group.providers.map((p) => (
        <ProviderRow
          key={p.id}
          provider={p}
          title={title}
          link={link}
          note={freeNotes[p.id]}
          isFree={freeIds.includes(p.id)}
        />
      ))}
    </ul>
  );
}

function ProviderRow({
  provider,
  title,
  link,
  note,
  isFree,
}: {
  provider: GroupedProvider;
  title: string;
  link: string | null;
  note?: string;
  /** Listed in free-services.yaml: TMDB's "flatrate" really means free here. */
  isFree: boolean;
}) {
  const offers = [
    ...new Set(provider.offers.map((o) => (isFree && o === "flatrate" ? "Free" : OFFER_LABELS[o]))),
  ];
  return (
    <li className="flex flex-wrap items-center gap-3 py-3" data-provider-id={provider.id}>
      <ProviderLogo path={provider.logoPath} name={provider.name} />
      <div className="min-w-0 flex-1">
        <p className="font-medium">{provider.name}</p>
        <p className="text-muted text-sm">
          {offers.join(" · ")}
          {note ? ` · ${note}` : ""}
        </p>
      </div>
      {link && (
        <a
          href={link}
          target="_blank"
          rel="noopener noreferrer"
          className="border-border bg-surface hover:bg-surface-2 rounded-lg border px-3 py-2 text-sm font-medium"
        >
          Watch on {provider.name}
          <span className="sr-only"> – {title} (opens in a new tab)</span>
        </a>
      )}
    </li>
  );
}
