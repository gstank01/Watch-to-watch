/**
 * Validates the curated YAML data files. Run as part of `npm run build`, so
 * invalid data fails the build.
 */
import { loadFreeServicesFile } from "../lib/data/load";

try {
  const free = loadFreeServicesFile();
  console.log(`✓ free-services.yaml: ${free.length} entries`);
} catch (err) {
  console.error(`✗ ${(err as Error).message}`);
  process.exit(1);
}
