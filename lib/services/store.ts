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
const listeners = new Set<(ids: number[]) => void>();

export const readServices = store.read;

/** A change made by the visitor (account sync listens to these). */
export function writeServices(ids: number[]) {
  const unique = [...new Set(ids)];
  store.write(unique);
  for (const listener of listeners) listener(unique);
}

/** Replace the services without it counting as the visitor's change. */
export function replaceServices(ids: number[]) {
  store.write([...new Set(ids)]);
}

export function onServicesChange(listener: (ids: number[]) => void) {
  listeners.add(listener);
  return () => void listeners.delete(listener);
}

export function toggleService(current: number[], id: number) {
  writeServices(current.includes(id) ? current.filter((x) => x !== id) : [...current, id]);
}

/** The visitor's services, or `null` before hydration (unknown on the server). */
export const useMyServices = store.useValue;
