import type { MonetizationType, Provider, RegionProviders } from "@/lib/tmdb/schemas";

export type GroupKey = "mine" | "free" | "trial" | "subscription" | "rentBuy";

/** Display order for Flow A. */
export const GROUP_ORDER: readonly GroupKey[] = [
  "mine",
  "free",
  "trial",
  "subscription",
  "rentBuy",
];

export const GROUP_LABELS: Record<GroupKey, string> = {
  mine: "On your services",
  free: "Free",
  trial: "Free trial available",
  subscription: "Other subscriptions",
  rentBuy: "Rent / buy",
};

export type GroupedProvider = {
  id: number;
  name: string;
  logoPath: string | null;
  /** Every way this provider offers the title, e.g. ["flatrate"] or ["rent", "buy"]. */
  offers: MonetizationType[];
};

export type ProviderGroup = { key: GroupKey; label: string; providers: GroupedProvider[] };

export type GroupInput = {
  providers: RegionProviders;
  /** TMDB ids of the services the user has. */
  userServices: Iterable<number>;
  /** TMDB ids from free-services.yaml for the region. */
  freeProviderIds: Iterable<number>;
  /** TMDB ids with a current (non-stale, trial_days > 0) free trial in the region. */
  trialProviderIds?: Iterable<number>;
};

const STREAMABLE: MonetizationType[] = ["flatrate", "free", "ads"];

/**
 * Groups a title's providers in Flow A order. Each provider appears only in its
 * highest-priority group:
 *
 * 1. On your services — the user has it and it streams the title (not rent/buy).
 * 2. Free — offered as free/ads, or listed in free-services.yaml.
 * 3. Free trial available — a subscription with a current trial.
 * 4. Other subscriptions.
 * 5. Rent / buy — only available to rent or buy.
 *
 * Empty groups are omitted. Within a group, TMDB's display priority is kept.
 */
export function groupProviders({
  providers,
  userServices,
  freeProviderIds,
  trialProviderIds = [],
}: GroupInput): ProviderGroup[] {
  const mine = new Set(userServices);
  const free = new Set(freeProviderIds);
  const trials = new Set(trialProviderIds);

  // Collect each provider once, with all its offer types, keeping first-seen order
  // by TMDB display priority.
  const byId = new Map<number, GroupedProvider & { priority: number }>();
  for (const type of ["flatrate", "free", "ads", "rent", "buy"] as const) {
    for (const p of providers[type] ?? ([] as Provider[])) {
      const existing = byId.get(p.provider_id);
      if (existing) {
        if (!existing.offers.includes(type)) existing.offers.push(type);
        existing.priority = Math.min(existing.priority, p.display_priority ?? 999);
      } else {
        byId.set(p.provider_id, {
          id: p.provider_id,
          name: p.provider_name,
          logoPath: p.logo_path ?? null,
          offers: [type],
          priority: p.display_priority ?? 999,
        });
      }
    }
  }

  const buckets: Record<GroupKey, (GroupedProvider & { priority: number })[]> = {
    mine: [],
    free: [],
    trial: [],
    subscription: [],
    rentBuy: [],
  };

  for (const p of byId.values()) {
    const streams = p.offers.some((o) => STREAMABLE.includes(o));
    const isFree =
      p.offers.includes("free") || p.offers.includes("ads") || (streams && free.has(p.id));
    let key: GroupKey;
    if (streams && mine.has(p.id)) key = "mine";
    else if (isFree) key = "free";
    else if (p.offers.includes("flatrate") && trials.has(p.id)) key = "trial";
    else if (p.offers.includes("flatrate")) key = "subscription";
    else key = "rentBuy";
    buckets[key].push(p);
  }

  return GROUP_ORDER.filter((key) => buckets[key].length > 0).map((key) => ({
    key,
    label: GROUP_LABELS[key],
    providers: buckets[key]
      .sort((a, b) => a.priority - b.priority)
      .map(({ id, name, logoPath, offers }) => ({ id, name, logoPath, offers })),
  }));
}
