import { describe, expect, it } from "vitest";
import { usageChangesSchema, usageSettingsSchema } from "@/lib/account/schemas";
import {
  changesForAccount,
  diffUsage,
  isEmptyChanges,
  mergeUsage,
  type RemoteUsage,
} from "@/lib/checkup/sync-model";
import {
  addDays,
  daysThisMonth,
  EMPTY_USAGE,
  recordUse,
  setPrice,
  type Usage,
} from "@/lib/checkup/usage";

const TODAY = "2026-10-22";
const usage = (over: Partial<Usage>): Usage => ({ ...EMPTY_USAGE, ...over });
const remote = (over: Partial<RemoteUsage>): RemoteUsage => ({
  since: null,
  days: {},
  prices: {},
  ...over,
});

describe("this month", () => {
  it("counts days in the current calendar month only", () => {
    const u = usage({ days: { "8": ["2026-09-30", "2026-10-01", "2026-10-15", TODAY] } });
    expect(daysThisMonth(u, 8, TODAY)).toBe(3);
    expect(daysThisMonth(u, 8, "2026-10-14")).toBe(1);
    expect(daysThisMonth(u, 337, TODAY)).toBe(0);
  });
});

describe("saving usage to the account", () => {
  it("merges two devices by adding their days together", () => {
    const local = usage({
      since: "2026-10-10",
      days: { "8": ["2026-10-12", TODAY] },
      prices: { "GB:8": 10.99 },
    });
    const account = remote({
      since: "2026-09-01",
      days: { "8": ["2026-10-01", TODAY], "337": ["2026-10-05"] },
      prices: { "GB:8": 9.99, "GB:337": 7.99 },
    });
    expect(mergeUsage(local, account, TODAY)).toEqual({
      counting: true,
      since: "2026-09-01",
      days: { "8": ["2026-10-01", "2026-10-12", TODAY], "337": ["2026-10-05"] },
      // This browser's price wins for the same service.
      prices: { "GB:8": 10.99, "GB:337": 7.99 },
    });
  });

  it("drops days older than the kept window when merging", () => {
    const old = addDays(TODAY, -90);
    const merged = mergeUsage(usage({}), remote({ days: { "8": [old, TODAY] } }), TODAY);
    expect(merged.days).toEqual({ "8": [TODAY] });
  });

  it("sends the account only what it is missing", () => {
    const merged = usage({
      since: "2026-09-01",
      days: { "8": ["2026-10-01", TODAY] },
      prices: { "GB:8": 10.99 },
    });
    expect(
      changesForAccount(
        merged,
        remote({ since: "2026-09-01", days: { "8": ["2026-10-01"] }, prices: { "GB:8": 10.99 } }),
      ),
    ).toEqual({ add: [{ providerId: 8, day: TODAY }], remove: [] });
    expect(isEmptyChanges(changesForAccount(merged, remote({ ...merged })))).toBe(true);
  });

  it("turns a change on this device into days added, removed and prices", () => {
    const before = recordUse(usage({}), 8, "2026-10-21");
    const after = setPrice(recordUse(before, 337, TODAY), "GB", 337, 7.99);
    expect(diffUsage(before, after)).toEqual({
      add: [{ providerId: 337, day: TODAY }],
      remove: [],
      prices: { "GB:337": 7.99 },
    });
    expect(diffUsage(after, before)).toEqual({
      add: [],
      remove: [{ providerId: 337, day: TODAY }],
      prices: {},
    });
    expect(isEmptyChanges(diffUsage(after, after))).toBe(true);
  });

  it("accepts sensible changes and refuses anything else", () => {
    expect(usageSettingsSchema.safeParse({ enabled: true, since: TODAY }).success).toBe(true);
    expect(usageSettingsSchema.safeParse({ enabled: "yes" }).success).toBe(false);
    const ok = {
      add: [{ providerId: 8, day: TODAY }],
      remove: [],
      prices: { "GB:8": 10.99, "BG:337": 9.5 },
    };
    expect(usageChangesSchema.safeParse(ok).success).toBe(true);
    for (const bad of [
      { ...ok, add: [{ providerId: 8, day: "22/10/2026" }] },
      { ...ok, add: [{ providerId: -1, day: TODAY }] },
      { ...ok, prices: { "GB:8": 1000 } },
      { ...ok, prices: { "GB:8": 10.999 } },
      { ...ok, prices: { netflix: 10 } },
      { ...ok, add: Array.from({ length: 501 }, () => ({ providerId: 8, day: TODAY })) },
    ]) {
      expect(usageChangesSchema.safeParse(bad).success).toBe(false);
    }
  });
});
