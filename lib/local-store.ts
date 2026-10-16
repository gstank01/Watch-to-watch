"use client";

import { useSyncExternalStore } from "react";

/**
 * A value kept in localStorage and shared by every component that reads it,
 * across tabs too. Every access is wrapped in try/catch: storage can be missing
 * or blocked (private windows, cleared site data), and the app must still work.
 * If saving fails, the value is kept in memory for the rest of the page view.
 */
export function createLocalStore<T>(key: string, parse: (raw: string | null) => T) {
  const changeEvent = `wtw:change:${key}`;
  let memory: string | null = null;
  let useMemory = false;

  function readRaw(): string | null {
    if (useMemory) return memory;
    try {
      return window.localStorage.getItem(key);
    } catch {
      return memory;
    }
  }

  // useSyncExternalStore needs a stable snapshot, so cache the parsed value by raw string.
  let lastRaw: string | null | undefined;
  let lastValue: T = parse(null);
  function read(): T {
    const raw = readRaw();
    if (raw !== lastRaw) {
      lastRaw = raw;
      lastValue = parse(raw);
    }
    return lastValue;
  }

  function write(value: T) {
    const raw = JSON.stringify(value);
    memory = raw;
    try {
      window.localStorage.setItem(key, raw);
    } catch {
      useMemory = true;
    }
    window.dispatchEvent(new Event(changeEvent));
  }

  function subscribe(onChange: () => void) {
    const onStorage = (e: StorageEvent) => {
      if (e.key === null || e.key === key) onChange();
    };
    window.addEventListener("storage", onStorage);
    window.addEventListener(changeEvent, onChange);
    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener(changeEvent, onChange);
    };
  }

  /** The stored value, or `null` before hydration (unknown on the server). */
  function useValue(): T | null {
    return useSyncExternalStore(subscribe, read, () => null);
  }

  return { read, write, useValue };
}
