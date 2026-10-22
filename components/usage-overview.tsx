"use client";

import Link from "next/link";
import { useUsage, useUsageSaved } from "@/lib/checkup/store";
import { daysUsed, localDay, monthlyUse, priceKey } from "@/lib/checkup/usage";
import { useMyServices } from "@/lib/services/store";
import type { ProviderInfo } from "@/lib/tmdb/types";
import { ProviderLogo } from "./provider-logo";

const MONTHS = 3;

const monthLabel = (month: string, style: "long" | "short") =>
  new Date(`${month}-15T12:00:00Z`).toLocaleString("en-GB", { month: style, timeZone: "UTC" });

const daysText = (n: number) => `${n} ${n === 1 ? "day" : "days"}`;

/** "My usage": days each service was used, month by month, and what each day cost. */
export function UsageOverview({
  providers,
  freeProviderIds,
  region,
  currency,
  signedIn,
}: {
  providers: ProviderInfo[];
  freeProviderIds: number[];
  region: string;
  currency: string;
  signedIn: boolean;
}) {
  const services = useMyServices();
  const usage = useUsage();
  const saved = useUsageSaved();
  if (!services || !usage) return <p className="text-muted">Loading your usage…</p>;

  const byId = new Map(providers.map((p) => [p.id, p]));
  const mine = services.flatMap((id) => byId.get(id) ?? []);
  if (mine.length === 0) {
    return (
      <p className="border-border bg-surface rounded-xl border p-4">
        Tick the services you have on{" "}
        <Link className="text-accent underline" href="/services">
          My services
        </Link>{" "}
        and press &ldquo;Watch on&rdquo; when you watch something: your usage builds up here.
      </p>
    );
  }
  if (!usage.counting) {
    return (
      <p className="border-border bg-surface rounded-xl border p-4">
        Counting is off, so there&apos;s no usage to show. You can turn it back on in the check-up
        on{" "}
        <Link className="text-accent underline" href="/services">
          My services
        </Link>
        .
      </p>
    );
  }

  const today = localDay();
  const free = new Set(freeProviderIds);
  const money = new Intl.NumberFormat("en-GB", { style: "currency", currency });
  const rows = mine.map((provider) => ({
    provider,
    free: free.has(provider.id),
    months: monthlyUse(usage, provider.id, today, MONTHS),
    last30: daysUsed(usage, provider.id, today, 30),
    price: usage.prices[priceKey(region, provider.id)] ?? null,
  }));
  // The same months for every service: they depend only on today and when counting began.
  const months = rows[0].months;
  const paid = rows.filter((r) => !r.free);
  const usedThisMonth = paid.filter((r) => r.months[0].days > 0);
  const priced = paid.filter((r) => r.price !== null);
  const total = priced.reduce((sum, r) => sum + r.price!, 0);
  const unusedSpend = priced
    .filter((r) => r.months[0].days === 0)
    .reduce((sum, r) => sum + r.price!, 0);
  const thisMonth = monthLabel(months[0].month, "long");

  return (
    <div className="space-y-6">
      <div className="grid gap-3 sm:grid-cols-3" data-testid="usage-summary">
        <Stat
          label={`Paid services used in ${thisMonth}`}
          value={`${usedThisMonth.length} of ${paid.length}`}
        />
        <Stat
          label="You pay a month"
          value={priced.length ? money.format(total) : "Add prices"}
          note={priced.length < paid.length ? "for the services you've priced" : undefined}
        />
        <Stat
          label={`Paid for, unused in ${thisMonth}`}
          value={priced.length ? money.format(unusedSpend) : "–"}
        />
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[36rem] text-left text-sm">
          <caption className="text-muted mb-2 text-left">
            Days you used each service through WhatToWatch. A month marked * was only partly
            counted.
          </caption>
          <thead>
            <tr className="border-border border-b">
              <th scope="col" className="py-2 pr-3 font-medium">
                Service
              </th>
              {months.map((m, i) => (
                <th key={m.month} scope="col" className="py-2 pr-3 font-medium">
                  {monthLabel(m.month, "long")}
                  {i === 0 ? " so far" : ""}
                </th>
              ))}
              <th scope="col" className="py-2 pr-3 font-medium">
                Price a month
              </th>
              <th scope="col" className="py-2 font-medium">
                Cost per day used (last 30 days)
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr
                key={r.provider.id}
                className="border-border border-b"
                data-provider-id={r.provider.id}
              >
                <th scope="row" className="py-2 pr-3 font-medium">
                  <span className="flex items-center gap-2">
                    <ProviderLogo path={r.provider.logoPath} name={r.provider.name} size={28} />
                    {r.provider.name}
                  </span>
                </th>
                {months.map((m) => {
                  const count = r.months.find((x) => x.month === m.month);
                  return (
                    <td key={m.month} className="py-2 pr-3">
                      {count ? daysText(count.days) : "–"}
                      {count?.partial && m !== months[0] ? " *" : ""}
                    </td>
                  );
                })}
                <td className="py-2 pr-3">
                  {r.free ? "Free" : r.price !== null ? money.format(r.price) : "–"}
                </td>
                <td className="py-2">
                  {r.free || r.price === null
                    ? "–"
                    : r.last30 === 0
                      ? "Not used"
                      : `${money.format(r.price / r.last30)} (${money.format(r.price)} ÷ ${daysText(r.last30)})`}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="text-muted max-w-prose text-sm">
        A day counts when you press &ldquo;Watch on&rdquo; for one of your services, or tap &ldquo;I
        used it today&rdquo;. Watching straight from a TV app isn&apos;t counted.{" "}
        {signedIn && saved
          ? "This usage is saved to your account, so all your devices count together."
          : "This usage is kept in this browser only."}{" "}
        For keep-or-pause suggestions, prices and settings, see the check-up on{" "}
        <Link className="text-accent underline" href="/services">
          My services
        </Link>
        .
      </p>
    </div>
  );
}

function Stat({ label, value, note }: { label: string; value: string; note?: string }) {
  return (
    <div className="border-border bg-surface rounded-xl border p-4">
      <p className="text-muted text-sm">{label}</p>
      <p className="text-2xl font-semibold">{value}</p>
      {note && <p className="text-muted text-xs">{note}</p>}
    </div>
  );
}
