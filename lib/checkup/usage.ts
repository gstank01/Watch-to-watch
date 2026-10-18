/**
 * Which days the visitor used each of their services, for the service check-up.
 * A day counts when they press a "Watch on" button for one of their services,
 * or tap "I used it today". Kept in this browser only (lib/checkup/store.ts).
 * Pure functions; days are local calendar dates, "YYYY-MM-DD".
 */

/** Days of history kept; older days are dropped. */
export const KEEP_DAYS = 90;

export type Usage = {
  /** False when the visitor turned counting off: nothing is recorded. */
  counting: boolean;
  /** The day counting began, or null before it has. */
  since: string | null;
  /** Provider id → days it was used, oldest first. */
  days: Record<string, string[]>;
  /** "REGION:providerId" → what the visitor pays a month, in the region's currency. */
  prices: Record<string, number>;
};

export const EMPTY_USAGE: Usage = { counting: true, since: null, days: {}, prices: {} };

const DAY = /^\d{4}-\d{2}-\d{2}$/;
const isDay = (v: unknown): v is string => typeof v === "string" && DAY.test(v);

/** The local calendar date of `date`. */
export function localDay(date = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

/** `day` moved by `n` days. Done in UTC so clock changes can't skip a day. */
export function addDays(day: string, n: number): string {
  const d = new Date(`${day}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

/** Whole days from `from` to `to` (0 when they're the same day). */
export function daysBetween(from: string, to: string): number {
  return Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / 86_400_000);
}

export const priceKey = (region: string, providerId: number) => `${region}:${providerId}`;

/** A sensible monthly price: 0.01 to 999.99, two decimal places. */
export const isPrice = (v: unknown): v is number =>
  typeof v === "number" && Number.isFinite(v) && v > 0 && v < 1000;

/** Reads stored usage, dropping anything malformed. */
export function parseUsage(raw: string | null): Usage {
  if (!raw) return EMPTY_USAGE;
  try {
    const value: unknown = JSON.parse(raw);
    if (!value || typeof value !== "object") return EMPTY_USAGE;
    const v = value as Record<string, unknown>;
    const days: Record<string, string[]> = {};
    if (v.days && typeof v.days === "object") {
      for (const [id, list] of Object.entries(v.days)) {
        if (!/^\d+$/.test(id) || !Array.isArray(list)) continue;
        const valid = [...new Set(list.filter(isDay))].sort();
        if (valid.length) days[id] = valid;
      }
    }
    const prices: Record<string, number> = {};
    if (v.prices && typeof v.prices === "object") {
      for (const [key, price] of Object.entries(v.prices)) {
        if (/^[A-Z]{2}:\d+$/.test(key) && isPrice(price)) prices[key] = price;
      }
    }
    return {
      counting: v.counting !== false,
      since: isDay(v.since) ? v.since : null,
      days,
      prices,
    };
  } catch {
    return EMPTY_USAGE;
  }
}

/** Starts counting today, if it hasn't started yet. */
export function startCounting(usage: Usage, today: string): Usage {
  if (!usage.counting || usage.since) return usage;
  return { ...usage, since: today };
}

/** Marks `providerId` as used on `today`. Does nothing while counting is off. */
export function recordUse(usage: Usage, providerId: number, today: string): Usage {
  if (!usage.counting) return usage;
  const started = startCounting(usage, today);
  const key = String(providerId);
  const existing = started.days[key] ?? [];
  if (existing.includes(today)) return started;
  const oldest = addDays(today, -KEEP_DAYS);
  const days: Record<string, string[]> = {};
  for (const [id, list] of Object.entries({ ...started.days, [key]: [...existing, today] })) {
    const kept = list.filter((d) => d > oldest).sort();
    if (kept.length) days[id] = kept;
  }
  return { ...started, days };
}

/** Takes back "used today" for `providerId`. */
export function unrecordUse(usage: Usage, providerId: number, today: string): Usage {
  const key = String(providerId);
  const list = usage.days[key];
  if (!list?.includes(today)) return usage;
  const days = { ...usage.days };
  const rest = list.filter((d) => d !== today);
  if (rest.length) days[key] = rest;
  else delete days[key];
  return { ...usage, days };
}

export const usedOn = (usage: Usage, providerId: number, day: string) =>
  usage.days[String(providerId)]?.includes(day) ?? false;

/** Days `providerId` was used in the `window` days up to and including `today`. */
export function daysUsed(usage: Usage, providerId: number, today: string, window: number): number {
  const after = addDays(today, -window);
  return (usage.days[String(providerId)] ?? []).filter((d) => d > after && d <= today).length;
}

export function setPrice(
  usage: Usage,
  region: string,
  providerId: number,
  price: number | null,
): Usage {
  const prices = { ...usage.prices };
  const key = priceKey(region, providerId);
  if (price === null) delete prices[key];
  else if (isPrice(price)) prices[key] = Math.round(price * 100) / 100;
  else throw new RangeError(`Not a monthly price: ${price}`);
  return { ...usage, prices };
}

/** Turns counting on or off. Turning it off forgets the days already counted. */
export function setCounting(usage: Usage, counting: boolean): Usage {
  return counting ? { ...usage, counting } : { ...usage, counting, since: null, days: {} };
}

/** Forgets the days counted (keeps prices), and starts again today. */
export function forgetUsage(usage: Usage, today: string): Usage {
  return { ...usage, days: {}, since: usage.counting ? today : null };
}

/**
 * Reads a price as typed ("10.99", "£10.99", "10,99"). Empty means no price;
 * `undefined` means it isn't a price we can use.
 */
export function parsePriceInput(text: string): number | null | undefined {
  const cleaned = text.replace(/[£€$\s]|лв\.?/g, "").replace(",", ".");
  if (cleaned === "") return null;
  if (!/^\d{1,3}(\.\d{1,2})?$/.test(cleaned)) return undefined;
  const price = Number(cleaned);
  return isPrice(price) ? price : undefined;
}
