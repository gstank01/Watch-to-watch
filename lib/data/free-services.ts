import "server-only";
import { loadFreeServicesFile } from "./load";
import type { FreeService } from "./schemas";

let cache: FreeService[] | undefined;

function all() {
  cache ??= loadFreeServicesFile();
  return cache;
}

export function getFreeServices(region: string): FreeService[] {
  return all().filter((s) => s.region === region);
}

export function getFreeProviderIds(region: string): number[] {
  return getFreeServices(region).map((s) => s.provider_id);
}
