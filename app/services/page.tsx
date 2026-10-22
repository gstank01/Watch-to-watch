import type { Metadata } from "next";
import { DataProblem } from "@/components/data-problem";
import { ServiceCheckup } from "@/components/service-checkup";
import { ServicesPicker } from "@/components/services-picker";
import { getSessionUser } from "@/lib/auth/server";
import { getFreeProviderIds } from "@/lib/data/free-services";
import { getRegion } from "@/lib/region";
import { regionInfo } from "@/lib/region-shared";
import { getProviders } from "@/lib/tmdb";
import { reportTmdbError } from "@/lib/tmdb/problem";
import type { ProviderInfo } from "@/lib/tmdb/types";

export const metadata: Metadata = { title: "My services" };

export default async function ServicesPage() {
  const region = await getRegion();
  const { name, currency } = regionInfo(region);
  const user = await getSessionUser();
  let providers: ProviderInfo[] | null = null;
  let problem: string | null = null;
  try {
    providers = await getProviders(region);
  } catch (err) {
    problem = reportTmdbError(err, `services list (${region})`);
  }

  return (
    <div className="space-y-8">
      <header className="space-y-2">
        <h1 className="text-2xl font-bold">My services</h1>
        <p className="text-muted max-w-prose">
          Tick the services you already have in {name}. We&apos;ll put titles on them first, and
          tell you which ones are worth keeping. Your choices are saved in this browser, and in your
          account when you&apos;re signed in.
        </p>
      </header>
      {providers ? (
        <>
          <ServiceCheckup
            providers={providers}
            freeProviderIds={getFreeProviderIds(region)}
            region={region}
            currency={currency}
            signedIn={!!user}
          />
          <section aria-labelledby="choose-services" className="space-y-4">
            <h2 id="choose-services" className="text-xl font-semibold">
              Your services
            </h2>
            <ServicesPicker providers={providers} freeProviderIds={getFreeProviderIds(region)} />
          </section>
        </>
      ) : (
        <DataProblem message={problem ?? ""} />
      )}
    </div>
  );
}
