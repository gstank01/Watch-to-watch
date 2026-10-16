/**
 * Validates the curated YAML data files. Run as part of `npm run build`, so
 * invalid data fails the build.
 */
import { loadFreeServicesFile, loadProviderLinksFile } from "../lib/data/load";

let failed = false;
for (const [label, load] of [
  ["free-services.yaml", loadFreeServicesFile],
  ["provider-links.yaml", loadProviderLinksFile],
] as const) {
  try {
    console.log(`✓ ${label}: ${load().length} entries`);
  } catch (err) {
    console.error(`✗ ${(err as Error).message}`);
    failed = true;
  }
}
if (failed) process.exit(1);
