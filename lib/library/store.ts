"use client";

import { createLocalStore } from "@/lib/local-store";
import { parseLibrary, type Library } from "./model";

/** The visitor's list, kept in this browser until accounts arrive (M4). */
export const LIBRARY_KEY = "wtw:library:v1";

const store = createLocalStore(LIBRARY_KEY, parseLibrary);

/** The visitor's list, or `null` before hydration. */
export const useLibrary = store.useValue;

export function updateLibrary(change: (lib: Library) => Library) {
  store.write(change(store.read()));
}
