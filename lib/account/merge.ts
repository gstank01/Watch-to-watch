import {
  libraryKey,
  type Library,
  type LibraryEntry,
  type LibraryTitle,
} from "@/lib/library/model";

export type TitleRef = Pick<LibraryTitle, "id" | "mediaType">;

/** Changes to send to the account. */
export type LibraryChanges = { upsert: LibraryEntry[]; remove: TitleRef[] };

const same = (a: LibraryEntry | undefined, b: LibraryEntry | undefined) =>
  JSON.stringify(a) === JSON.stringify(b);

/** Newest change wins for each title; on a tie the account's copy wins. */
export function mergeLibraries(local: Library, remote: Library): Library {
  const merged: Library = { ...remote };
  for (const [key, entry] of Object.entries(local)) {
    const theirs = remote[key];
    if (!theirs || entry.updatedAt > theirs.updatedAt) merged[key] = entry;
  }
  return merged;
}

/** What changed between two versions of the list. */
export function diffLibraries(prev: Library, next: Library): LibraryChanges {
  const upsert: LibraryEntry[] = [];
  const remove: TitleRef[] = [];
  for (const [key, entry] of Object.entries(next)) {
    if (!same(prev[key], entry)) upsert.push(entry);
  }
  for (const [key, entry] of Object.entries(prev)) {
    if (!next[key]) remove.push({ id: entry.id, mediaType: entry.mediaType });
  }
  return { upsert, remove };
}

export const toLibrary = (entries: LibraryEntry[]): Library =>
  Object.fromEntries(entries.map((e) => [libraryKey(e), e]));

/** Changes waiting to reach the account, keyed so later changes replace earlier ones. */
export type Pending = {
  upsert: Record<string, LibraryEntry>;
  remove: Record<string, TitleRef>;
  /** The whole services list to save, or null if unchanged. */
  services: number[] | null;
};

export const EMPTY_PENDING: Pending = { upsert: {}, remove: {}, services: null };

export function queueChanges(pending: Pending, changes: LibraryChanges): Pending {
  const upsert = { ...pending.upsert };
  const remove = { ...pending.remove };
  for (const e of changes.upsert) {
    upsert[libraryKey(e)] = e;
    delete remove[libraryKey(e)];
  }
  for (const r of changes.remove) {
    remove[libraryKey(r)] = r;
    delete upsert[libraryKey(r)];
  }
  return { ...pending, upsert, remove };
}

export const hasPending = (p: Pending) =>
  Object.keys(p.upsert).length > 0 || Object.keys(p.remove).length > 0 || p.services !== null;

/** Applies queued changes on top of the account's list (for changes made while loading). */
export function applyPending(lib: Library, pending: Pending): Library {
  const next = { ...lib, ...pending.upsert };
  for (const key of Object.keys(pending.remove)) delete next[key];
  return next;
}

/** Drops what the account has confirmed, keeping anything changed again since. */
export function acknowledge(pending: Pending, sent: Pending): Pending {
  const upsert = { ...pending.upsert };
  const remove = { ...pending.remove };
  for (const [key, e] of Object.entries(sent.upsert)) if (same(upsert[key], e)) delete upsert[key];
  for (const key of Object.keys(sent.remove)) if (remove[key] && !upsert[key]) delete remove[key];
  const services =
    sent.services !== null && JSON.stringify(pending.services) === JSON.stringify(sent.services)
      ? null
      : pending.services;
  return { upsert, remove, services };
}

export const mergeServices = (local: number[], remote: number[]) => [
  ...new Set([...remote, ...local]),
];
