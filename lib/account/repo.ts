import "server-only";
import { db } from "@/lib/db";
import type { MediaType, WatchStatus as DbStatus } from "@/lib/generated/prisma/enums";
import type { LibraryEntry, WatchStatus } from "@/lib/library/model";
import type { LibraryChanges } from "./merge";
import { LIMITS } from "./schemas";

const toDbMedia = (m: LibraryEntry["mediaType"]): MediaType => (m === "movie" ? "MOVIE" : "TV");
const fromDbMedia = (m: MediaType): LibraryEntry["mediaType"] => (m === "MOVIE" ? "movie" : "tv");
const toDbStatus = (s: WatchStatus | null): DbStatus | null =>
  s === null ? null : (s.toUpperCase() as DbStatus);
const fromDbStatus = (s: DbStatus | null): WatchStatus | null =>
  s === null ? null : (s.toLowerCase() as WatchStatus);

export async function getLibrary(userId: string): Promise<LibraryEntry[]> {
  const rows = await db().watchlistItem.findMany({
    where: { userId },
    orderBy: { updatedAt: "desc" },
  });
  return rows.map((r) => ({
    id: r.tmdbId,
    mediaType: fromDbMedia(r.mediaType),
    title: r.title,
    year: r.year,
    posterPath: r.posterPath,
    favourite: r.favourite,
    status: fromDbStatus(r.status),
    rating: r.rating,
    updatedAt: r.updatedAt.toISOString(),
  }));
}

export class LimitError extends Error {}

/**
 * Applies changes from a device. For each title the newest change wins, so a
 * slow or offline device can't overwrite a newer change made elsewhere.
 */
export async function applyLibraryChanges(userId: string, changes: LibraryChanges) {
  const key = (id: number, m: LibraryEntry["mediaType"]) => `${m}:${id}`;
  await db().$transaction(async (tx) => {
    const existing = await tx.watchlistItem.findMany({
      where: { userId },
      select: { tmdbId: true, mediaType: true, updatedAt: true },
    });
    const current = new Map(existing.map((r) => [key(r.tmdbId, fromDbMedia(r.mediaType)), r]));

    for (const e of changes.upsert) {
      const found = current.get(key(e.id, e.mediaType));
      const updatedAt = new Date(e.updatedAt);
      if (found && found.updatedAt > updatedAt) continue; // a newer change already landed
      const where = {
        userId_mediaType_tmdbId: { userId, mediaType: toDbMedia(e.mediaType), tmdbId: e.id },
      };
      if (!e.favourite && !e.status && e.rating === null) {
        if (found) await tx.watchlistItem.delete({ where });
        continue;
      }
      const data = {
        title: e.title,
        year: e.year,
        posterPath: e.posterPath,
        favourite: e.favourite,
        status: toDbStatus(e.status),
        rating: e.rating,
        updatedAt,
      };
      await tx.watchlistItem.upsert({
        where,
        create: { userId, tmdbId: e.id, mediaType: toDbMedia(e.mediaType), ...data },
        update: data,
      });
    }

    for (const r of changes.remove) {
      await tx.watchlistItem.deleteMany({
        where: { userId, tmdbId: r.id, mediaType: toDbMedia(r.mediaType) },
      });
    }

    if ((await tx.watchlistItem.count({ where: { userId } })) > LIMITS.perAccount) {
      throw new LimitError(`My list is limited to ${LIMITS.perAccount} titles`);
    }
  });
}

/** A title needs this many ratings before its community score is shown. */
export const MIN_COMMUNITY_RATINGS = 3;

export type CommunityRating = { average: number; count: number };

/**
 * The average of signed-in users' ratings for a title, or null below
 * MIN_COMMUNITY_RATINGS (one rating isn't a consensus, and with one or two
 * anyone could work out what a person gave). Individual ratings are never shown.
 */
export async function communityRating(
  mediaType: LibraryEntry["mediaType"],
  tmdbId: number,
): Promise<CommunityRating | null> {
  const { _avg, _count } = await db().watchlistItem.aggregate({
    where: { mediaType: toDbMedia(mediaType), tmdbId, rating: { not: null } },
    _avg: { rating: true },
    _count: { rating: true },
  });
  if (_count.rating < MIN_COMMUNITY_RATINGS || _avg.rating === null) return null;
  return { average: Math.round(_avg.rating * 10) / 10, count: _count.rating };
}

export async function getServices(userId: string): Promise<number[]> {
  const rows = await db().userService.findMany({ where: { userId }, select: { providerId: true } });
  return rows.map((r) => r.providerId);
}

export async function setServices(userId: string, providerIds: number[]) {
  const unique = [...new Set(providerIds)];
  await db().$transaction([
    db().userService.deleteMany({ where: { userId } }),
    db().userService.createMany({ data: unique.map((providerId) => ({ userId, providerId })) }),
  ]);
}

/** Hard delete: the user row cascades to sessions, sign-in records, services and list. */
export async function deleteAccount(userId: string) {
  await db().user.delete({ where: { id: userId } });
}

// ---- Service check-up usage, saved only when the user turns it on ----

/** Days kept on the account: the check-up's 90, plus slack for time zones. */
const USAGE_KEEP_DAYS = 92;

const toDate = (day: string) => new Date(`${day}T00:00:00Z`);
const fromDate = (d: Date) => d.toISOString().slice(0, 10);

export class UsageSyncOffError extends Error {}

export type AccountUsage =
  | { enabled: false }
  | {
      enabled: true;
      since: string | null;
      days: Record<string, string[]>;
      prices: Record<string, number>;
    };

export async function getUsage(userId: string, now = new Date()): Promise<AccountUsage> {
  const sync = await db().usageSync.findUnique({ where: { userId } });
  if (!sync) return { enabled: false };
  const oldest = new Date(now.getTime() - USAGE_KEEP_DAYS * 86_400_000);
  const rows = await db().serviceUseDay.findMany({
    where: { userId, day: { gte: oldest } },
    orderBy: { day: "asc" },
  });
  const days: Record<string, string[]> = {};
  for (const r of rows) (days[String(r.providerId)] ??= []).push(fromDate(r.day));
  return {
    enabled: true,
    since: sync.since ? fromDate(sync.since) : null,
    days,
    prices: (sync.prices ?? {}) as Record<string, number>,
  };
}

export async function enableUsageSync(userId: string, since: string | null) {
  await db().usageSync.upsert({
    where: { userId },
    create: { userId, since: since ? toDate(since) : null },
    update: {},
  });
}

/** Turning it off deletes everything saved: the setting, the prices and every day. */
export async function disableUsageSync(userId: string) {
  await db().$transaction([
    db().serviceUseDay.deleteMany({ where: { userId } }),
    db().usageSync.deleteMany({ where: { userId } }),
  ]);
}

/**
 * Adds and removes days, and replaces prices and the start day when sent.
 * Days outside the kept window (or more than a day ahead) are ignored.
 */
export async function applyUsageChanges(
  userId: string,
  changes: {
    add: { providerId: number; day: string }[];
    remove: { providerId: number; day: string }[];
    prices?: Record<string, number>;
    since?: string | null;
  },
  now = new Date(),
) {
  const oldest = new Date(now.getTime() - USAGE_KEEP_DAYS * 86_400_000);
  const latest = new Date(now.getTime() + 2 * 86_400_000);
  const inWindow = (day: string) => toDate(day) >= oldest && toDate(day) <= latest;
  await db().$transaction(async (tx) => {
    const sync = await tx.usageSync.findUnique({ where: { userId } });
    if (!sync) throw new UsageSyncOffError("Saving usage is off for this account");
    const add = changes.add.filter((r) => inWindow(r.day));
    if (add.length) {
      await tx.serviceUseDay.createMany({
        data: add.map((r) => ({ userId, providerId: r.providerId, day: toDate(r.day) })),
        skipDuplicates: true,
      });
    }
    if (changes.remove.length) {
      await tx.serviceUseDay.deleteMany({
        where: {
          userId,
          OR: changes.remove.map((r) => ({ providerId: r.providerId, day: toDate(r.day) })),
        },
      });
    }
    await tx.serviceUseDay.deleteMany({ where: { userId, day: { lt: oldest } } });
    if (changes.prices !== undefined || changes.since !== undefined) {
      await tx.usageSync.update({
        where: { userId },
        data: {
          ...(changes.prices !== undefined && { prices: changes.prices }),
          ...(changes.since !== undefined && {
            since: changes.since ? toDate(changes.since) : null,
          }),
        },
      });
    }
  });
}
