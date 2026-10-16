"use client";

import { createLocalStore } from "@/lib/local-store";

/** "My services" for anonymous visitors, kept in this browser. */
export const SERVICES_KEY = "wtw:services:v1";

export function parseServices(raw: string | null): number[] {
  if (!raw) return [];
  try {
    const value: unknown = JSON.parse(raw);
    if (!Array.isArray(value)) return [];
    return [...new Set(value.filter((n): n is number => Number.isInteger(n) && n > 0))];
  } catch {
    return [];
  }
}

const store = createLocalStore(SERVICES_KEY, parseServices);

export function writeServices(ids: number[]) {
  store.write([...new Set(ids)]);
}

export function toggleService(current: number[], id: number) {
  writeServices(current.includes(id) ? current.filter((x) => x !== id) : [...current, id]);
}

/** The visitor's services, or `null` before hydration (unknown on the server). */
export const useMyServices = store.useValue;
