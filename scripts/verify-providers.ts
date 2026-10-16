/**
 * Checks that every provider id in the curated data files exists in TMDB and
 * that the name still matches. Region-less entries (provider-links.yaml) are
 * checked against every supported region. Needs TMDB_API_TOKEN.
 *
 *   TMDB_API_TOKEN=... npm run verify-providers
 */
import { loadFreeServicesFile, loadProviderLinksFile } from "../lib/data/load";
import { SUPPORTED_REGION_CODES } from "../lib/region-shared";

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

type Entry = { provider_id: number; provider_name: string; region?: string };

async function main() {
  const live = new Map<string, Map<number, string>>();
  for (const region of SUPPORTED_REGION_CODES) live.set(region, await providersFor(region));

  let problems = 0;
  const check = (file: string, entries: Entry[]) => {
    for (const e of entries) {
      const regions = e.region ? [e.region] : SUPPORTED_REGION_CODES;
      const where = `${file} ${e.region ?? "all"} ${e.provider_id} (${e.provider_name})`;
      const names = regions.map((r) => live.get(r)?.get(e.provider_id)).filter(Boolean);
      if (names.length === 0) {
        problems++;
        console.log(`✗ ${where}: not listed by TMDB in ${regions.join("/")}`);
      } else if (!names.includes(e.provider_name)) {
        console.log(`! ${where}: TMDB calls it "${names[0]}"`);
      } else {
        console.log(`✓ ${where}`);
      }
    }
  };
  check("free-services.yaml", loadFreeServicesFile());
  check("provider-links.yaml", loadProviderLinksFile());
  process.exit(problems ? 1 : 0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
