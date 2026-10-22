import type { Metadata } from "next";
import { DataProblem } from "@/components/data-problem";
import { UsageOverview } from "@/components/usage-overview";
import { getSessionUser } from "@/lib/auth/server";
import { getFreeProviderIds } from "@/lib/data/free-services";
import { getRegion } from "@/lib/region";
import { regionInfo } from "@/lib/region-shared";
import { getProviders } from "@/lib/tmdb";
import { reportTmdbError } from "@/lib/tmdb/problem";
import type { ProviderInfo } from "@/lib/tmdb/types";

export const metadata: Metadata = { title: "My usage" };

export default async function UsagePage() {
  const region = await getRegion();
  const { currency } = regionInfo(region);
  const user = await getSessionUser();
  let providers: ProviderInfo[] | null = null;
  let problem: string | null = null;
  try {
    providers = await getProviders(region);
  } catch (err) {
    problem = reportTmdbError(err, `usage page providers (${region})`);
  }

  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <h1 className="text-2xl font-bold">My usage</h1>
        <p className="text-muted max-w-prose">
          How often you&apos;ve used each of your services, month by month, and what each day of
          watching cost you.
        </p>
      </header>
      {providers ? (
        <UsageOverview
          providers={providers}
          freeProviderIds={getFreeProviderIds(region)}
          region={region}
          currency={currency}
          signedIn={!!user}
        />
      ) : (
        <DataProblem message={problem ?? ""} />
      )}
    </div>
  );
}
