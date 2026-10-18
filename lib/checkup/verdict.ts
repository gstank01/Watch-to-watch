/**
 * The service check-up: for each of the visitor's services, suggest keeping
 * it or pausing it, from how often they used it here and what's on their list.
 * Plain rules, so every suggestion can say why. Pure functions.
 */
import { daysBetween, daysUsed, type Usage } from "./usage";

/** Look back this many days. */
export const WINDOW_DAYS = 30;
/** Say nothing about use until we've counted for this many days. */
export const MIN_TRACKED_DAYS = 14;
/** Used on this many days in the window = regular use. */
export const REGULAR_USE_DAYS = 4;
/** Most list titles we look up. */
export const MAX_CHECKED_TITLES = 60;

/** Where a list title streams in the visitor's country (see /api/availability). */
export type TitleAvailability = {
  /** Every provider that streams it: subscription, free or with ads. */
  providers: number[];
  /** It's free somewhere (a free service, or free with ads). */
  free: boolean;
};

export type ServiceFacts = {
  name: string;
  free: boolean;
  /** Days counted so far, today included; null before counting starts. */
  trackedDays: number | null;
  /** Days used in the window (the last 30 days, or fewer if counting began later). */
  daysUsed: number;
  /** False when we couldn't look up the visitor's list. */
  listChecked: boolean;
  /** Titles being watched that stream here. */
  watchingHere: string[];
  /** Want-to-watch titles that stream here. */
  wantHere: string[];
  /** ...of those, ones not free and not on the visitor's other services. */
  wantOnlyHere: string[];
};

export type VerdictKind = "keep" | "review" | "pause" | "early" | "free";
export type Verdict = { kind: VerdictKind; headline: string; reasons: string[] };

/** Most useful first: what to act on, then what's fine. */
export const VERDICT_ORDER: readonly VerdictKind[] = ["pause", "review", "keep", "early", "free"];

/** Suggestions that could save money. */
export const isFlagged = (kind: VerdictKind) => kind === "pause" || kind === "review";

export const windowDays = (trackedDays: number | null) => Math.min(WINDOW_DAYS, trackedDays ?? 0);

const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? "" : "s"}`;

/** "A", "A and B", "A, B and C", "A, B and 3 more". */
export function listTitles(titles: string[]): string {
  if (titles.length <= 1) return titles[0] ?? "";
  if (titles.length <= 3) return `${titles.slice(0, -1).join(", ")} and ${titles.at(-1)}`;
  return `${titles.slice(0, 2).join(", ")} and ${titles.length - 2} more`;
}

export function checkService(f: ServiceFacts): Verdict {
  if (f.free) return { kind: "free", headline: "Free: nothing to cancel", reasons: [] };

  const window = windowDays(f.trackedDays);
  const early = f.trackedDays === null || f.trackedDays < MIN_TRACKED_DAYS;
  const used =
    f.daysUsed === 0
      ? `You haven't used it in the last ${plural(window, "day")}.`
      : `You used it on ${plural(f.daysUsed, "day")} in the last ${plural(window, "day")}.`;
  const onlyHere = f.wantOnlyHere.length
    ? [
        `${listTitles(f.wantOnlyHere)} from your Want to watch list ${
          f.wantOnlyHere.length === 1 ? "is" : "are"
        } only on ${f.name}.`,
      ]
    : [];
  const elsewhere = !f.listChecked
    ? []
    : f.wantHere.length
      ? [
          `Everything on your Want to watch list that's on ${f.name} is also free or on your other services.`,
        ]
      : [`Nothing on your Want to watch list is on ${f.name}.`];

  // Regular use is clear even before a full window of counting.
  if (f.daysUsed >= REGULAR_USE_DAYS) {
    return { kind: "keep", headline: "Keep it", reasons: [used] };
  }
  if (f.watchingHere.length) {
    return {
      kind: "keep",
      headline: "Keep it",
      reasons: [`You're in the middle of ${listTitles(f.watchingHere)}.`, ...(early ? [] : [used])],
    };
  }
  if (early) {
    const counted =
      f.trackedDays === null
        ? "We haven't started counting yet."
        : `We've been counting for ${plural(f.trackedDays, "day")}. Check back in ${plural(
            MIN_TRACKED_DAYS - f.trackedDays,
            "day",
          )}.`;
    return { kind: "early", headline: "Too early to tell", reasons: [counted, ...onlyHere] };
  }
  if (f.daysUsed > 0) {
    return onlyHere.length
      ? { kind: "keep", headline: "Keep for now", reasons: [used, ...onlyHere] }
      : {
          kind: "review",
          headline: "Light use",
          reasons: [
            used,
            ...elsewhere,
            "If that's normal for you, you could pause it and rejoin when something you want arrives.",
          ],
        };
  }
  if (f.wantOnlyHere.length >= 3) {
    return { kind: "review", headline: "Use it or pause it", reasons: [used, ...onlyHere] };
  }
  if (f.wantOnlyHere.length) {
    return {
      kind: "review",
      headline: `Watch ${listTitles(f.wantOnlyHere)}, then pause it`,
      reasons: [used, ...onlyHere],
    };
  }
  return {
    kind: "pause",
    headline: "Consider pausing",
    reasons: [used, ...elsewhere, "You can rejoin any time."],
  };
}

export type ListTitle = { key: string; title: string; status: "want" | "watching" };

/** The facts for one service, from the counted days and the visitor's list. */
export function factsFor({
  providerId,
  name,
  free,
  usage,
  today,
  myServices,
  list,
  availability,
}: {
  providerId: number;
  name: string;
  free: boolean;
  usage: Usage;
  today: string;
  myServices: number[];
  list: ListTitle[];
  /** Keyed by ListTitle.key; null when the lookup failed. */
  availability: Record<string, TitleAvailability> | null;
}): ServiceFacts {
  // At least 1, even if the clock has gone back since counting began.
  const trackedDays = usage.since ? Math.max(1, daysBetween(usage.since, today) + 1) : null;
  const others = myServices.filter((id) => id !== providerId);
  const here = list.filter((t) => availability?.[t.key]?.providers.includes(providerId));
  const want = here.filter((t) => t.status === "want");
  return {
    name,
    free,
    trackedDays,
    daysUsed: daysUsed(usage, providerId, today, windowDays(trackedDays)),
    listChecked: availability !== null,
    watchingHere: here.filter((t) => t.status === "watching").map((t) => t.title),
    wantHere: want.map((t) => t.title),
    wantOnlyHere: want
      .filter((t) => {
        const a = availability![t.key];
        return !a.free && !others.some((id) => a.providers.includes(id));
      })
      .map((t) => t.title),
  };
}
