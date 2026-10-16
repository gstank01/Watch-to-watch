import type { Metadata } from "next";
import { ServicesPicker } from "@/components/services-picker";
import { getFreeProviderIds } from "@/lib/data/free-services";
import { getRegion } from "@/lib/region";
import { regionName } from "@/lib/regions";
import { getProviders } from "@/lib/tmdb";

export const metadata: Metadata = { title: "My services" };

export default async function ServicesPage() {
  const region = await getRegion();
  const [name, providers] = await Promise.all([
    regionName(region),
    getProviders(region).catch(() => null),
  ]);

  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <h1 className="text-2xl font-bold">My services</h1>
        <p className="text-muted max-w-prose">
          Tick the services you already have in {name}. We&apos;ll put titles on them first. Your
          choices are saved in this browser only — we never see them.
        </p>
      </header>
      {providers ? (
        <ServicesPicker providers={providers} freeProviderIds={getFreeProviderIds(region)} />
      ) : (
        <p className="text-muted">
          We can&apos;t load the list of services right now. Please try again shortly.
        </p>
      )}
    </div>
  );
}
