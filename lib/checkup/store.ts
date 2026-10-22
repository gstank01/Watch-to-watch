"use client";

import { createLocalStore } from "@/lib/local-store";
import { EMPTY_USAGE, localDay, parseUsage, recordUse, type Usage } from "./usage";

/**
 * Service use for the check-up, kept in this browser. Copied to the account
 * only when a signed-in visitor turns that on (lib/checkup/sync.ts).
 */
export const USAGE_KEY = "wtw:usage:v1";

const store = createLocalStore(USAGE_KEY, parseUsage);
type Listener = (prev: Usage, next: Usage) => void;
const listeners = new Set<Listener>();

/** The counted usage, or `null` before hydration. */
export const useUsage = store.useValue;

export const readUsage = store.read;

/** A change made by the visitor (saving to the account listens to these). */
export function updateUsage(change: (usage: Usage) => Usage) {
  const prev = store.read();
  const next = change(prev);
  if (next === prev) return;
  store.write(next);
  for (const listener of listeners) listener(prev, next);
}

/** Replace the usage without it counting as the visitor's change (e.g. merged from the account). */
export function replaceUsage(usage: Usage) {
  store.write(usage);
}

export function onUsageChange(listener: Listener) {
  listeners.add(listener);
  return () => void listeners.delete(listener);
}

/** Counts today as a day the visitor used `providerId`. */
export function recordServiceUse(providerId: number) {
  updateUsage((usage) => recordUse(usage, providerId, localDay()));
}

/** Whether this browser is saving usage to the signed-in account. */
const syncFlag = createLocalStore("wtw:usage-sync:v1", (raw) => raw === "true");
export const useUsageSaved = syncFlag.useValue;
export const readUsageSaved = syncFlag.read;
export const writeUsageSaved = syncFlag.write;

/** Forget usage in this browser (sign-out, account deletion). */
export function clearUsage() {
  store.write(EMPTY_USAGE);
  syncFlag.write(false);
}
