"use client";

import { createLocalStore } from "@/lib/local-store";
import { EMPTY_USAGE, localDay, parseUsage, recordUse, type Usage } from "./usage";

/** Service use for the check-up. Only ever kept in this browser; never sent anywhere. */
export const USAGE_KEY = "wtw:usage:v1";

const store = createLocalStore(USAGE_KEY, parseUsage);

/** The counted usage, or `null` before hydration. */
export const useUsage = store.useValue;

export const readUsage = store.read;

export function updateUsage(change: (usage: Usage) => Usage) {
  const prev = store.read();
  const next = change(prev);
  if (next !== prev) store.write(next);
}

/** Counts today as a day the visitor used `providerId`. */
export function recordServiceUse(providerId: number) {
  updateUsage((usage) => recordUse(usage, providerId, localDay()));
}

export function clearUsage() {
  store.write(EMPTY_USAGE);
}
