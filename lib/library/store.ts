"use client";

import { createLocalStore } from "@/lib/local-store";
import { parseLibrary, type Library } from "./model";

/** The visitor's list in this browser; synced to their account when signed in. */
export const LIBRARY_KEY = "wtw:library:v1";

const store = createLocalStore(LIBRARY_KEY, parseLibrary);
type Listener = (prev: Library, next: Library) => void;
const listeners = new Set<Listener>();

/** The visitor's list, or `null` before hydration. */
export const useLibrary = store.useValue;

export const readLibrary = store.read;

/** A change made by the visitor (account sync listens to these). */
export function updateLibrary(change: (lib: Library) => Library) {
  const prev = store.read();
  const next = change(prev);
  store.write(next);
  for (const listener of listeners) listener(prev, next);
}

/** Replace the list without it counting as the visitor's change (e.g. loaded from the account). */
export function replaceLibrary(lib: Library) {
  store.write(lib);
}

export function onLibraryChange(listener: Listener) {
  listeners.add(listener);
  return () => void listeners.delete(listener);
}
