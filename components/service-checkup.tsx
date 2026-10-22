"use client";

import Link from "next/link";
import { useEffect, useId, useMemo, useState } from "react";
import { updateUsage, useUsage, useUsageSaved } from "@/lib/checkup/store";
import { setUsageSaved } from "@/lib/checkup/sync";
import {
  daysThisMonth,
  forgetUsage,
  localDay,
  parsePriceInput,
  priceKey,
  recordUse,
  setCounting,
  setPrice,
  startCounting,
  unrecordUse,
  usedOn,
} from "@/lib/checkup/usage";
import {
  checkService,
  factsFor,
  isFlagged,
  MAX_CHECKED_TITLES,
  VERDICT_ORDER,
  type ListTitle,
  type TitleAvailability,
  type Verdict,
  type VerdictKind,
} from "@/lib/checkup/verdict";
import { useLibrary } from "@/lib/library/store";
import { useMyServices } from "@/lib/services/store";
import type { ProviderInfo } from "@/lib/tmdb/types";
import { ProviderLogo } from "./provider-logo";

const TONES: Record<VerdictKind, { card: string; text: string }> = {
  keep: { card: "border-free/40 bg-free-soft", text: "text-free" },
  review: { card: "border-warn/50 bg-warn-soft", text: "text-warn" },
  pause: { card: "border-warn/50 bg-warn-soft", text: "text-warn" },
  early: { card: "border-border bg-surface", text: "" },
  free: { card: "border-border bg-surface", text: "" },
};

type Row = {
  provider: ProviderInfo;
  verdict: Verdict;
  price: number | null;
  free: boolean;
  thisMonth: number;
};
type Lookup = { key: string; results: Record<string, TitleAvailability> | null };

/**
 * "Are your services worth it?": for each ticked service, how often it was
 * used here, what on the visitor's list needs it, and a keep/pause suggestion.
 */
export function ServiceCheckup({
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
  /** Signed in with accounts on: offer saving usage to the account. */
  signedIn: boolean;
}) {
  const services = useMyServices();
  const saved = useUsageSaved();
  // While a change is being sent, show the choice just made.
  const [savingTo, setSavingTo] = useState<boolean | null>(null);
  const library = useLibrary();
  const usage = useUsage();
  const [message, setMessage] = useState("");
  const [lookup, setLookup] = useState<Lookup | null>(null);

  // The titles that say whether a service is needed: what you want to watch, or are watching.
  const list = useMemo<ListTitle[] | null>(() => {
    if (!library) return null;
    return Object.entries(library)
      .flatMap(([key, e]) =>
        e.status === "want" || e.status === "watching"
          ? [{ key, title: e.title, status: e.status, updatedAt: e.updatedAt }]
          : [],
      )
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
      .slice(0, MAX_CHECKED_TITLES)
      .map(({ key, title, status }) => ({ key, title, status }));
  }, [library]);
  // Sorted, so reordering the list (changing a status) doesn't look everything up again.
  const titleKeys =
    list
      ?.map((t) => t.key)
      .sort()
      .join(",") ?? null;
  const lookupKey = titleKeys ? `${region}|${titleKeys}` : null;
  const hasServices = !!services?.length;

  useEffect(() => {
    if (!hasServices || !lookupKey || !titleKeys) return;
    const controller = new AbortController();
    fetch(`/api/availability?titles=${titleKeys}`, { signal: controller.signal })
      .then((res) => (res.ok ? res.json() : Promise.reject(new Error(`HTTP ${res.status}`))))
      .then((body: { results: Record<string, TitleAvailability> }) =>
        setLookup({ key: lookupKey, results: body.results }),
      )
      .catch(() => {
        if (!controller.signal.aborted) setLookup({ key: lookupKey, results: null });
      });
    return () => controller.abort();
  }, [hasServices, lookupKey, titleKeys]);

  // Counting starts the first time someone with services looks at their check-up.
  useEffect(() => {
    if (hasServices) updateUsage((u) => startCounting(u, localDay()));
  }, [hasServices]);

  if (!services || !library || !usage || !list) return null;
  const byId = new Map(providers.map((p) => [p.id, p]));
  const mine = services.flatMap((id) => byId.get(id) ?? []);
  if (mine.length === 0) return null;

  const today = localDay();
  // Empty list: nothing to look up. Otherwise wait for (or give up on) the lookup.
  const availability = titleKeys === "" ? {} : lookup?.key === lookupKey ? lookup.results : null;
  const checking = titleKeys !== "" && lookup?.key !== lookupKey;
  const free = new Set(freeProviderIds);
  const money = new Intl.NumberFormat("en-GB", { style: "currency", currency });
  const monthName = new Date(`${today}T12:00:00Z`).toLocaleString("en-GB", {
    month: "long",
    timeZone: "UTC",
  });

  const rows: Row[] = mine
    .map((provider) => {
      const facts = factsFor({
        providerId: provider.id,
        name: provider.name,
        free: free.has(provider.id),
        usage,
        today,
        myServices: services,
        list,
        availability,
      });
      return {
        provider,
        verdict: checkService(facts),
        price: usage.prices[priceKey(region, provider.id)] ?? null,
        free: facts.free,
        thisMonth: daysThisMonth(usage, provider.id, today),
      };
    })
    .sort((a, b) => VERDICT_ORDER.indexOf(a.verdict.kind) - VERDICT_ORDER.indexOf(b.verdict.kind));

  function toggleUsedToday(provider: ProviderInfo) {
    const used = usedOn(usage!, provider.id, today);
    updateUsage((u) =>
      used ? unrecordUse(u, provider.id, today) : recordUse(u, provider.id, today),
    );
    setMessage(
      used
        ? `Took back today for ${provider.name}.`
        : `Counted today as a day you used ${provider.name}.`,
    );
  }

  function savePrice(provider: ProviderInfo, price: number | null) {
    updateUsage((u) => setPrice(u, region, provider.id, price));
    setMessage(
      price === null
        ? `Removed the price for ${provider.name}.`
        : `Saved: you pay ${money.format(price)} a month for ${provider.name}.`,
    );
  }

  function turnCounting(on: boolean) {
    if (
      !on &&
      !window.confirm("Turn counting off? We'll also forget the days we've counted so far.")
    ) {
      return;
    }
    updateUsage((u) => {
      const next = setCounting(u, on);
      return on ? startCounting(next, today) : next;
    });
    setMessage(on ? "Counting is on." : "Counting is off, and the counted days are forgotten.");
  }

  async function toggleSaved(on: boolean) {
    if (
      !on &&
      !window.confirm(
        "Stop saving usage to your account? The copy in your account is deleted. This browser keeps its own.",
      )
    ) {
      return;
    }
    setSavingTo(on);
    try {
      await setUsageSaved(on);
      setMessage(
        on
          ? "Your usage is now saved to your account."
          : "Stopped saving. The copy in your account is deleted.",
      );
    } catch {
      setMessage("Couldn't change this just now. Please try again.");
    } finally {
      setSavingTo(null);
    }
  }

  function forget() {
    if (!window.confirm("Forget the days we've counted? The check-up starts again from today.")) {
      return;
    }
    updateUsage((u) => forgetUsage(u, today));
    setMessage("Forgot the counted days. Counting starts again from today.");
  }

  return (
    <section aria-labelledby="checkup" className="space-y-4">
      <div className="space-y-2">
        <h2 id="checkup" className="text-xl font-semibold">
          Check-up: are your services worth it?
        </h2>
        <p className="text-muted max-w-prose text-sm">
          A day counts as used when you press &ldquo;Watch on&rdquo; for one of your services here,
          or tap &ldquo;I used it today&rdquo;. We also look at what&apos;s on your Want to watch
          and Watching lists.{" "}
          {saved && signedIn
            ? "Your counted days and prices are also saved to your account."
            : "The counting happens in this browser only: it's never sent to us."}
        </p>
      </div>

      {signedIn && usage.counting && (
        <div className="border-border bg-surface space-y-1 rounded-xl border p-4">
          <label className="flex items-center gap-3 font-medium">
            <input
              type="checkbox"
              checked={savingTo ?? !!saved}
              disabled={saved === null || savingTo !== null}
              onChange={(e) => void toggleSaved(e.target.checked)}
              className="size-5 accent-[var(--accent)]"
            />
            Save my usage to my account
          </label>
          <p className="text-muted pl-8 text-sm">
            So your phone and computer count together. We save only which service you used and on
            which day, never what you watched. Turning it off deletes the copy in your account.
          </p>
        </div>
      )}

      {!usage.counting ? (
        <div className="border-border bg-surface flex flex-wrap items-center justify-between gap-3 rounded-xl border p-4">
          <p>Counting is off, so we can&apos;t tell which services you use.</p>
          <button
            type="button"
            onClick={() => turnCounting(true)}
            className="bg-accent text-accent-fg rounded-lg px-3 py-2 text-sm font-medium"
          >
            Turn counting on
          </button>
        </div>
      ) : checking ? (
        <p className="text-muted">Checking your list…</p>
      ) : (
        <>
          <Summary rows={rows} money={money} />
          {availability === null && (
            <p className="text-muted text-sm">
              We couldn&apos;t check where your list streams just now, so these suggestions only use
              the days counted.
            </p>
          )}
          <ul aria-label="Check-up for your services" className="grid gap-3 md:grid-cols-2">
            {rows.map((row) => (
              <ServiceCard
                key={row.provider.id}
                row={row}
                usedToday={usedOn(usage, row.provider.id, today)}
                currency={currency}
                money={money}
                monthName={monthName}
                onToggleUsed={() => toggleUsedToday(row.provider)}
                onPrice={(price) => savePrice(row.provider, price)}
              />
            ))}
          </ul>
          <div className="flex flex-wrap gap-2 text-sm">
            <button
              type="button"
              onClick={forget}
              className="border-border hover:bg-surface-2 rounded-lg border px-3 py-1.5"
            >
              Forget counted days
            </button>
            <button
              type="button"
              onClick={() => turnCounting(false)}
              className="border-border hover:bg-surface-2 rounded-lg border px-3 py-1.5"
            >
              Turn counting off
            </button>
            <Link
              href="/usage"
              className="border-border hover:bg-surface-2 rounded-lg border px-3 py-1.5"
            >
              See my usage by month
            </Link>
          </div>
        </>
      )}
      <p aria-live="polite" className="sr-only">
        {message}
      </p>
    </section>
  );
}

function Summary({ rows, money }: { rows: Row[]; money: Intl.NumberFormat }) {
  const paid = rows.filter((r) => !r.free);
  if (paid.length === 0) return null;
  const flagged = paid.filter((r) => isFlagged(r.verdict.kind));
  const priced = paid.filter((r) => r.price !== null);
  const total = priced.reduce((sum, r) => sum + r.price!, 0);
  const saving = flagged.reduce((sum, r) => sum + (r.price ?? 0), 0);
  const allEarly = paid.every((r) => r.verdict.kind === "early");

  const headline = flagged.length
    ? `${flagged.length} of your ${paid.length} paid ${
        paid.length === 1 ? "service" : "services"
      } could be worth pausing.`
    : allEarly
      ? "We're still getting to know how you use your services."
      : `Your paid ${paid.length === 1 ? "service looks" : "services look"} worth keeping.`;

  return (
    <div className="border-border bg-surface space-y-1 rounded-xl border p-4" data-testid="summary">
      <p className="font-semibold">{headline}</p>
      <p className="text-muted text-sm">
        {priced.length
          ? `You pay ${money.format(total)} a month (${money.format(total * 12)} a year) for the ${
              priced.length === 1 ? "service" : `${priced.length} services`
            } you've priced.`
          : "Add what you pay for each one to see what you could save."}
        {saving > 0 &&
          ` Pausing the ${flagged.length === 1 ? "one" : "ones"} we've flagged could save ${money.format(
            saving,
          )} a month.`}
      </p>
    </div>
  );
}

function ServiceCard({
  row,
  usedToday,
  currency,
  money,
  monthName,
  onToggleUsed,
  onPrice,
}: {
  row: Row;
  usedToday: boolean;
  currency: string;
  money: Intl.NumberFormat;
  monthName: string;
  onToggleUsed: () => void;
  onPrice: (price: number | null) => void;
}) {
  const { provider, verdict, price } = row;
  const tone = TONES[verdict.kind];
  return (
    <li
      className={`space-y-3 rounded-xl border p-4 ${tone.card}`}
      data-provider-id={provider.id}
      aria-labelledby={`checkup-${provider.id}`}
    >
      <div className="flex items-center gap-3">
        <ProviderLogo path={provider.logoPath} name={provider.name} size={36} />
        <div className="min-w-0">
          <h3 id={`checkup-${provider.id}`} className="font-semibold">
            {provider.name}
          </h3>
          <p className={`text-sm font-semibold ${tone.text}`} data-testid="verdict">
            {verdict.headline}
          </p>
          {!row.free && (
            <p className="text-muted text-sm" data-testid="this-month">
              {row.thisMonth === 0
                ? `Not used in ${monthName} so far`
                : `Used on ${row.thisMonth} ${row.thisMonth === 1 ? "day" : "days"} in ${monthName} so far`}
            </p>
          )}
        </div>
      </div>
      {(verdict.reasons.length > 0 || (price !== null && isFlagged(verdict.kind))) && (
        <ul className="list-disc space-y-1 pl-5 text-sm">
          {verdict.reasons.map((reason) => (
            <li key={reason}>{reason}</li>
          ))}
          {price !== null && isFlagged(verdict.kind) && (
            <li>Pausing it would save {money.format(price)} a month.</li>
          )}
        </ul>
      )}
      {!row.free && (
        <div className="flex flex-wrap items-end gap-3">
          <button
            type="button"
            aria-pressed={usedToday}
            onClick={onToggleUsed}
            className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-2 text-sm font-medium ${
              usedToday
                ? "border-accent bg-accent text-accent-fg"
                : "border-border bg-surface hover:bg-surface-2"
            }`}
          >
            {usedToday && <span aria-hidden>✓</span>}I used it today
            <span className="sr-only"> – {provider.name}</span>
          </button>
          <PriceInput name={provider.name} price={price} currency={currency} onPrice={onPrice} />
        </div>
      )}
    </li>
  );
}

function PriceInput({
  name,
  price,
  currency,
  onPrice,
}: {
  name: string;
  price: number | null;
  currency: string;
  onPrice: (price: number | null) => void;
}) {
  const id = useId();
  const [text, setText] = useState(price === null ? "" : price.toFixed(2));
  const [invalid, setInvalid] = useState(false);
  const symbol =
    new Intl.NumberFormat("en-GB", { style: "currency", currency })
      .formatToParts(0)
      .find((p) => p.type === "currency")?.value ?? "";

  function commit() {
    const parsed = parsePriceInput(text);
    setInvalid(parsed === undefined);
    if (parsed !== undefined && parsed !== price) onPrice(parsed);
  }

  return (
    <div className="space-y-1">
      <label htmlFor={id} className="block text-sm">
        What you pay a month<span className="sr-only"> for {name}</span>
      </label>
      <div className="flex items-center gap-1">
        <span aria-hidden className="text-muted">
          {symbol}
        </span>
        <input
          id={id}
          type="text"
          inputMode="decimal"
          autoComplete="off"
          value={text}
          onChange={(e) => setText(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => e.key === "Enter" && commit()}
          aria-invalid={invalid}
          aria-describedby={invalid ? `${id}-error` : undefined}
          placeholder="0.00"
          className="border-border bg-surface w-24 rounded-lg border px-2 py-1.5"
        />
      </div>
      {invalid && (
        <p id={`${id}-error`} className="text-warn text-sm">
          Enter an amount like 10.99.
        </p>
      )}
    </div>
  );
}
