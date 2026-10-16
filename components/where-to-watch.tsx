"use client";

import Link from "next/link";
import { groupProviders, type GroupedProvider, type ProviderGroup } from "@/lib/availability/group";
import type { WatchLink } from "@/lib/availability/links";
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
  /** Direct links to each service, from provider-links.yaml (see lib/availability/links.ts). */
  watchLinks: Record<number, WatchLink>;
};

export function WhereToWatch({
  title,
  regionName,
  providers,
  freeProviderIds,
  freeNotes,
  watchLinks,
}: Props) {
  const services = useMyServices();
  const groups = groupProviders({
    providers,
    userServices: services ?? [],
    freeProviderIds,
  });
  const tmdbLink = providers.link ?? null;

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
                watchLinks={watchLinks}
                tmdbLink={tmdbLink}
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
                watchLinks={watchLinks}
                tmdbLink={tmdbLink}
                freeNotes={freeNotes}
                freeIds={freeProviderIds}
              />
            </div>
          ),
        )
      )}

      <p className="text-muted text-xs">
        Buttons open each service&apos;s own website. Availability from{" "}
        <a className="underline" href="https://www.justwatch.com/" rel="noopener noreferrer">
          JustWatch
        </a>{" "}
        via TMDB; it can take a day or two to catch up with changes.
        {tmdbLink && (
          <>
            {" "}
            <a className="underline" href={tmdbLink} target="_blank" rel="noopener noreferrer">
              See this title on TMDB
              <span className="sr-only"> (opens in a new tab)</span>
            </a>
          </>
        )}
      </p>
    </section>
  );
}

function ProviderList({
  group,
  title,
  watchLinks,
  tmdbLink,
  freeNotes,
  freeIds,
}: {
  group: ProviderGroup;
  title: string;
  watchLinks: Record<number, WatchLink>;
  tmdbLink: string | null;
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
          watchLink={watchLinks[p.id]}
          tmdbLink={tmdbLink}
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
  watchLink,
  tmdbLink,
  note,
  isFree,
}: {
  provider: GroupedProvider;
  title: string;
  watchLink?: WatchLink;
  tmdbLink: string | null;
  note?: string;
  /** Listed in free-services.yaml: TMDB's "flatrate" really means free here. */
  isFree: boolean;
}) {
  const offers = [
    ...new Set(provider.offers.map((o) => (isFree && o === "flatrate" ? "Free" : OFFER_LABELS[o]))),
  ];
  // Straight to the service when we know how; otherwise TMDB's page for the title.
  const button = watchLink
    ? {
        href: watchLink.url,
        label: watchLink.kind === "search" ? `Watch on ${provider.name}` : `Open ${provider.name}`,
        hint:
          watchLink.kind === "search"
            ? `– search for ${title}`
            : `– then search for ${title} on ${provider.name}`,
      }
    : tmdbLink
      ? { href: tmdbLink, label: "Find on TMDB", hint: `– ${title} on ${provider.name}` }
      : null;

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
      {button && (
        <a
          href={button.href}
          target="_blank"
          rel="noopener noreferrer"
          className="border-border bg-surface hover:bg-surface-2 rounded-lg border px-3 py-2 text-sm font-medium"
        >
          {button.label}
          <span className="sr-only"> {button.hint} (opens in a new tab)</span>
        </a>
      )}
    </li>
  );
}
