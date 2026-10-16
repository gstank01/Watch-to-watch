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
      if (!e.favourite && !e.status) {
        if (found) await tx.watchlistItem.delete({ where });
        continue;
      }
      const data = {
        title: e.title,
        year: e.year,
        posterPath: e.posterPath,
        favourite: e.favourite,
        status: toDbStatus(e.status),
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
