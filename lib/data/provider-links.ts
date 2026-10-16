import "server-only";
import { loadProviderLinksFile } from "./load";
import type { ProviderLink } from "./schemas";

let cache: ProviderLink[] | undefined;

export function getProviderLinks(): ProviderLink[] {
  cache ??= loadProviderLinksFile();
  return cache;
}
