/**
 * Checks that every provider id in the curated data files exists in TMDB for
 * its region and that the name still matches. Needs TMDB_API_TOKEN.
 *
 *   TMDB_API_TOKEN=... npm run verify-providers
 */
import { loadFreeServicesFile } from "../lib/data/load";

const token = process.env.TMDB_API_TOKEN;
if (!token) {
  console.error("Set TMDB_API_TOKEN to run this check.");
  process.exit(1);
}

const base = process.env.TMDB_API_BASE_URL || "https://api.themoviedb.org/3";
type ProviderList = { results: { provider_id: number; provider_name: string }[] };

async function providersFor(region: string) {
  const names = new Map<number, string>();
  for (const type of ["movie", "tv"]) {
    const res = await fetch(`${base}/watch/providers/${type}?watch_region=${region}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) throw new Error(`TMDB returned HTTP ${res.status} for ${region}`);
    const body = (await res.json()) as ProviderList;
    for (const p of body.results) names.set(p.provider_id, p.provider_name);
  }
  return names;
}

async function main() {
  const entries = loadFreeServicesFile();
  const regions = [...new Set(entries.map((e) => e.region))];
  let problems = 0;
  for (const region of regions) {
    const live = await providersFor(region);
    for (const e of entries.filter((x) => x.region === region)) {
      const name = live.get(e.provider_id);
      if (!name) {
        problems++;
        console.log(`✗ ${region} ${e.provider_id} (${e.provider_name}): not listed by TMDB`);
      } else if (name !== e.provider_name) {
        console.log(
          `! ${region} ${e.provider_id}: TMDB calls it "${name}", file says "${e.provider_name}"`,
        );
      } else {
        console.log(`✓ ${region} ${e.provider_id} ${name}`);
      }
    }
  }
  process.exit(problems ? 1 : 0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
