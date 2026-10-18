"use client";

import { clearUsage } from "@/lib/checkup/store";
import { createLocalStore } from "@/lib/local-store";
import type { Library, LibraryEntry } from "@/lib/library/model";
import { onLibraryChange, readLibrary, replaceLibrary } from "@/lib/library/store";
import { onServicesChange, readServices, replaceServices } from "@/lib/services/store";
import {
  acknowledge,
  applyPending,
  diffLibraries,
  EMPTY_PENDING,
  hasPending,
  mergeLibraries,
  mergeServices,
  queueChanges,
  toLibrary,
  type Pending,
} from "./merge";

/**
 * Keeps this browser's My list and services in step with the signed-in account.
 *
 * - First sign-in on this browser: what's saved here is merged into the account.
 * - After that the account is the source of truth: each page load takes the
 *   account's copy, so changes and removals on other devices show up here.
 * - Changes are saved locally at once and sent in the background. Changes that
 *   can't be sent (offline) wait in `pending` and go with the next attempt.
 */

/** Which account this browser's data belongs to. */
const syncedUser = createLocalStore<string | null>("wtw:account:v1", (raw) => {
  try {
    const v: unknown = raw ? JSON.parse(raw) : null;
    return typeof v === "string" ? v : null;
  } catch {
    return null;
  }
});

const pendingStore = createLocalStore<Pending>("wtw:pending:v1", (raw) => {
  try {
    const v = raw ? (JSON.parse(raw) as Pending) : EMPTY_PENDING;
    return v && typeof v === "object" && v.upsert && v.remove ? v : EMPTY_PENDING;
  } catch {
    return EMPTY_PENDING;
  }
});

async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, {
    ...init,
    headers: { "content-type": "application/json", ...init?.headers },
    credentials: "same-origin",
  });
  if (!res.ok) throw new Error(`${init?.method ?? "GET"} ${path} failed: HTTP ${res.status}`);
  return (await res.json()) as T;
}

let flushing: Promise<void> | null = null;

async function sendPending() {
  while (hasPending(pendingStore.read())) {
    const sent = pendingStore.read();
    if (Object.keys(sent.upsert).length || Object.keys(sent.remove).length) {
      await api("/api/watchlist", {
        method: "POST",
        body: JSON.stringify({
          upsert: Object.values(sent.upsert),
          remove: Object.values(sent.remove),
        }),
      });
    }
    if (sent.services !== null) {
      await api("/api/services", {
        method: "PUT",
        body: JSON.stringify({ providerIds: sent.services }),
      });
    }
    pendingStore.write(acknowledge(pendingStore.read(), sent));
  }
}

/** Sends queued changes. Safe to call often; concurrent calls share one run. */
export function flush(): Promise<void> {
  if (!flushing) {
    // `.then` runs after `flushing` is assigned, even when there's nothing to send.
    flushing = sendPending().then(
      () => {
        flushing = null;
        // A change that arrived as the run was finishing.
        if (hasPending(pendingStore.read())) void flushQuietly();
      },
      (err: unknown) => {
        flushing = null; // retried on the next change, reconnect or page load
        throw err;
      },
    );
  }
  return flushing;
}

const flushQuietly = () => flush().catch(() => {}); // retried on the next change or load

/** Start syncing for this user. Returns a function that stops listening. */
export function startSync(userId: string): () => void {
  const stopLibrary = onLibraryChange((prev, next) => {
    pendingStore.write(queueChanges(pendingStore.read(), diffLibraries(prev, next)));
    void flushQuietly();
  });
  const stopServices = onServicesChange((ids) => {
    pendingStore.write({ ...pendingStore.read(), services: ids });
    void flushQuietly();
  });
  window.addEventListener("online", flushQuietly);
  void load(userId).catch(() => {});
  return () => {
    stopLibrary();
    stopServices();
    window.removeEventListener("online", flushQuietly);
  };
}

async function load(userId: string) {
  // First sign-in on this browser: what's saved here gets merged into the account.
  const firstTime = syncedUser.read() !== userId;
  if (!firstTime) await flushQuietly();

  const [{ entries }, { providerIds }] = await Promise.all([
    api<{ entries: LibraryEntry[] }>("/api/watchlist"),
    api<{ providerIds: number[] }>("/api/services"),
  ]);
  const remote: Library = toLibrary(entries);

  if (firstTime) {
    // Read local data now, so changes made while loading are included.
    const merged = mergeLibraries(readLibrary(), remote);
    const services = mergeServices(readServices(), providerIds);
    const servicesChanged = services.length !== new Set(providerIds).size;
    // Send only what the account doesn't already have.
    const pending = queueChanges(pendingStore.read(), diffLibraries(remote, merged));
    pendingStore.write(servicesChanged ? { ...pending, services } : pending);
    replaceLibrary(merged);
    replaceServices(services);
    await flush();
    // Only now does this browser count as synced; if anything failed, the merge reruns.
    syncedUser.write(userId);
  } else {
    const pending = pendingStore.read();
    replaceLibrary(applyPending(remote, pending));
    replaceServices(pending.services ?? providerIds);
  }
}

/** True when some changes haven't reached the account yet. */
export const hasUnsavedChanges = () => hasPending(pendingStore.read());

/** Forget this account's data in this browser (sign-out, account deletion). */
export function clearLocalAccountData() {
  replaceLibrary({});
  replaceServices([]);
  // Not account data, but it says which services were used here: don't leave it behind.
  clearUsage();
  pendingStore.write(EMPTY_PENDING);
  syncedUser.write(null);
}
