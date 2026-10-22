/**
 * Saving the check-up's usage to the account (opt-in). Days are facts that only
 * accumulate, so devices merge by union; the browser sends what changed.
 * Pure functions; lib/checkup/sync.ts does the sending.
 */
import { addDays, KEEP_DAYS, type Usage } from "./usage";

/** The account's copy, as `GET /api/usage` returns it when saving is on. */
export type RemoteUsage = {
  since: string | null;
  days: Record<string, string[]>;
  prices: Record<string, number>;
};

export type DayRef = { providerId: number; day: string };

/** What `POST /api/usage` accepts. `prices`, when present, replaces the account's prices. */
export type UsageChanges = {
  add: DayRef[];
  remove: DayRef[];
  prices?: Record<string, number>;
  since?: string | null;
};

const refs = (days: Record<string, string[]>) =>
  Object.entries(days).flatMap(([id, list]) =>
    list.map((day) => ({ providerId: Number(id), day })),
  );

const has = (days: Record<string, string[]>, r: DayRef) =>
  days[String(r.providerId)]?.includes(r.day) ?? false;

const samePrices = (a: Record<string, number>, b: Record<string, number>) =>
  Object.keys(a).length === Object.keys(b).length &&
  Object.entries(a).every(([k, v]) => b[k] === v);

const earliest = (a: string | null, b: string | null) => (a && b ? (a < b ? a : b) : (a ?? b));

/**
 * This browser's usage with the account's added in: every day either side
 * counted (within the last KEEP_DAYS), the earlier start, and prices from both
 * (this browser's price wins for the same service).
 */
export function mergeUsage(local: Usage, remote: RemoteUsage, today: string): Usage {
  const oldest = addDays(today, -KEEP_DAYS);
  const days: Record<string, string[]> = {};
  for (const r of [...refs(local.days), ...refs(remote.days)]) {
    if (r.day <= oldest) continue;
    const key = String(r.providerId);
    days[key] = [...new Set([...(days[key] ?? []), r.day])].sort();
  }
  return {
    ...local,
    since: earliest(local.since, remote.since),
    days,
    prices: { ...remote.prices, ...local.prices },
  };
}

/** What the account is missing compared with this browser (after a merge, nothing to remove). */
export function changesForAccount(local: Usage, remote: RemoteUsage): UsageChanges {
  const changes: UsageChanges = {
    add: refs(local.days).filter((r) => !has(remote.days, r)),
    remove: [],
  };
  if (!samePrices(local.prices, remote.prices)) changes.prices = local.prices;
  if (local.since !== remote.since) changes.since = local.since;
  return changes;
}

/** What changed between two versions of this browser's usage. */
export function diffUsage(prev: Usage, next: Usage): UsageChanges {
  const changes: UsageChanges = {
    add: refs(next.days).filter((r) => !has(prev.days, r)),
    remove: refs(prev.days).filter((r) => !has(next.days, r)),
  };
  if (!samePrices(prev.prices, next.prices)) changes.prices = next.prices;
  if (prev.since !== next.since) changes.since = next.since;
  return changes;
}

export const isEmptyChanges = (c: UsageChanges) =>
  c.add.length === 0 && c.remove.length === 0 && c.prices === undefined && c.since === undefined;
