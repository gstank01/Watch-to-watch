"use client";

import { useSyncExternalStore } from "react";

/**
 * "My services" for anonymous visitors, kept in localStorage. Every access is
 * wrapped in try/catch: storage can be missing or blocked (private windows,
 * cleared site data), and the app must still work without it.
 */
export const SERVICES_KEY = "wtw:services:v1";
const CHANGE_EVENT = "wtw:services-change";

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

function readRaw(): string | null {
  try {
    return window.localStorage.getItem(SERVICES_KEY);
  } catch {
    return null;
  }
}

// In-memory fallback so toggling still works for this page view when storage is blocked.
let memoryFallback: string | null = null;

export function writeServices(ids: number[]) {
  const raw = JSON.stringify([...new Set(ids)]);
  memoryFallback = raw;
  try {
    window.localStorage.setItem(SERVICES_KEY, raw);
  } catch {
    // Storage unavailable: keep the in-memory copy.
  }
  window.dispatchEvent(new Event(CHANGE_EVENT));
}

export function toggleService(current: number[], id: number) {
  writeServices(current.includes(id) ? current.filter((x) => x !== id) : [...current, id]);
}

function subscribe(onChange: () => void) {
  const onStorage = (e: StorageEvent) => {
    if (e.key === null || e.key === SERVICES_KEY) onChange();
  };
  window.addEventListener("storage", onStorage);
  window.addEventListener(CHANGE_EVENT, onChange);
  return () => {
    window.removeEventListener("storage", onStorage);
    window.removeEventListener(CHANGE_EVENT, onChange);
  };
}

// useSyncExternalStore needs a stable snapshot, so cache the parsed value by raw string.
let lastRaw: string | null | undefined;
let lastValue: number[] = [];
function getSnapshot(): number[] {
  const raw = readRaw() ?? memoryFallback;
  if (raw !== lastRaw) {
    lastRaw = raw;
    lastValue = parseServices(raw);
  }
  return lastValue;
}

const getServerSnapshot = () => null;

/** The visitor's services, or `null` before hydration (unknown on the server). */
export function useMyServices(): number[] | null {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
