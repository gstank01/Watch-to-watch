import { http, HttpResponse } from "msw";
import { describe, expect, it } from "vitest";
import { streamingFor, titleKeysSchema } from "@/lib/checkup/availability";
import {
  addDays,
  daysBetween,
  daysUsed,
  EMPTY_USAGE,
  forgetUsage,
  KEEP_DAYS,
  localDay,
  parsePriceInput,
  parseUsage,
  recordUse,
  setCounting,
  setPrice,
  startCounting,
  unrecordUse,
  type Usage,
} from "@/lib/checkup/usage";
import {
  checkService,
  factsFor,
  listTitles,
  MAX_CHECKED_TITLES,
  type ServiceFacts,
} from "@/lib/checkup/verdict";
import { TmdbError } from "@/lib/tmdb";
import { setupTmdbMock } from "./msw";

const server = setupTmdbMock();

const TODAY = "2026-10-18";

describe("counting service use", () => {
  it("does date sums on calendar days, across the clocks going back", () => {
    expect(addDays("2026-10-24", 2)).toBe("2026-10-26"); // UK clocks change on 25 October
    expect(addDays("2026-03-01", -1)).toBe("2026-02-28");
    expect(daysBetween("2026-10-01", TODAY)).toBe(17);
    expect(localDay(new Date(2026, 0, 5, 23, 59))).toBe("2026-01-05");
  });

  it("counts each service at most once a day and starts counting on first use", () => {
    let u = recordUse(EMPTY_USAGE, 8, TODAY);
    u = recordUse(u, 8, TODAY);
    u = recordUse(u, 337, TODAY);
    expect(u.since).toBe(TODAY);
    expect(u.days).toEqual({ "8": [TODAY], "337": [TODAY] });
  });

  it("counts days in a window that ends today", () => {
    let u: Usage = { ...EMPTY_USAGE, since: "2026-08-01" };
    for (const day of ["2026-09-18", "2026-09-19", "2026-10-01", TODAY]) u = recordUse(u, 8, day);
    expect(daysUsed(u, 8, TODAY, 30)).toBe(3); // 18 September is 30 days back: outside
    expect(daysUsed(u, 8, TODAY, 1)).toBe(1);
    expect(daysUsed(u, 337, TODAY, 30)).toBe(0);
  });

  it(`drops days older than ${KEEP_DAYS} days`, () => {
    let u = recordUse(EMPTY_USAGE, 8, addDays(TODAY, -KEEP_DAYS));
    u = recordUse(u, 337, addDays(TODAY, -KEEP_DAYS));
    u = recordUse(u, 8, TODAY);
    expect(u.days).toEqual({ "8": [TODAY] });
  });

  it("takes back today", () => {
    const u = unrecordUse(recordUse(EMPTY_USAGE, 8, TODAY), 8, TODAY);
    expect(u.days).toEqual({});
    expect(unrecordUse(u, 8, TODAY)).toBe(u);
  });

  it("records nothing while counting is off, and turning it off forgets", () => {
    const off = setCounting(recordUse(EMPTY_USAGE, 8, TODAY), false);
    expect(off).toMatchObject({ counting: false, since: null, days: {} });
    expect(recordUse(off, 8, TODAY)).toBe(off);
    expect(startCounting(off, TODAY)).toBe(off);
    expect(startCounting(setCounting(off, true), TODAY).since).toBe(TODAY);
  });

  it("forgets counted days but keeps prices", () => {
    let u = setPrice(recordUse(EMPTY_USAGE, 8, "2026-10-01"), "GB", 8, 10.99);
    u = forgetUsage(u, TODAY);
    expect(u).toMatchObject({ since: TODAY, days: {}, prices: { "GB:8": 10.99 } });
  });

  it("parses stored usage defensively", () => {
    expect(parseUsage(null)).toEqual(EMPTY_USAGE);
    expect(parseUsage("nope")).toEqual(EMPTY_USAGE);
    expect(
      parseUsage(
        JSON.stringify({
          counting: false,
          since: "2026-10-01",
          days: { "8": ["2026-10-02", "bad", "2026-10-01", "2026-10-02"], x: [TODAY], "9": [] },
          prices: { "GB:8": 10.99, "GB:9": -1, junk: 5, "BG:337": 9.99 },
        }),
      ),
    ).toEqual({
      counting: false,
      since: "2026-10-01",
      days: { "8": ["2026-10-01", "2026-10-02"] },
      prices: { "GB:8": 10.99, "BG:337": 9.99 },
    });
  });

  it("reads prices as people type them", () => {
    expect(parsePriceInput("10.99")).toBe(10.99);
    expect(parsePriceInput(" £10.99 ")).toBe(10.99);
    expect(parsePriceInput("9,99 €")).toBe(9.99);
    expect(parsePriceInput("12")).toBe(12);
    expect(parsePriceInput("")).toBeNull();
    expect(parsePriceInput("0")).toBeUndefined();
    expect(parsePriceInput("ten")).toBeUndefined();
    expect(parsePriceInput("1000")).toBeUndefined();
    expect(parsePriceInput("10.999")).toBeUndefined();
    expect(() => setPrice(EMPTY_USAGE, "GB", 8, -2)).toThrow(RangeError);
    expect(setPrice(setPrice(EMPTY_USAGE, "GB", 8, 5), "GB", 8, null).prices).toEqual({});
  });
});

const facts = (over: Partial<ServiceFacts> = {}): ServiceFacts => ({
  name: "Disney Plus",
  free: false,
  trackedDays: 40,
  daysUsed: 0,
  listChecked: true,
  watchingHere: [],
  wantHere: [],
  wantOnlyHere: [],
  ...over,
});

describe("keep or pause", () => {
  it("names titles briefly", () => {
    expect(listTitles(["A"])).toBe("A");
    expect(listTitles(["A", "B"])).toBe("A and B");
    expect(listTitles(["A", "B", "C"])).toBe("A, B and C");
    expect(listTitles(["A", "B", "C", "D", "E"])).toBe("A, B and 3 more");
  });

  it("says free services have nothing to cancel", () => {
    expect(checkService(facts({ free: true }))).toMatchObject({ kind: "free" });
  });

  it("keeps services used regularly, even before two weeks of counting", () => {
    expect(checkService(facts({ daysUsed: 6 }))).toEqual({
      kind: "keep",
      headline: "Keep it",
      reasons: ["You used it on 6 days in the last 30 days."],
    });
    expect(checkService(facts({ trackedDays: 5, daysUsed: 4 })).reasons).toEqual([
      "You used it on 4 days in the last 5 days.",
    ]);
  });

  it("keeps a service you're in the middle of something on", () => {
    expect(checkService(facts({ watchingHere: ["The Bear"] }))).toEqual({
      kind: "keep",
      headline: "Keep it",
      reasons: ["You're in the middle of The Bear.", "You haven't used it in the last 30 days."],
    });
  });

  it("waits two weeks before suggesting a pause", () => {
    expect(checkService(facts({ trackedDays: null }))).toEqual({
      kind: "early",
      headline: "Too early to tell",
      reasons: ["We haven't started counting yet."],
    });
    expect(checkService(facts({ trackedDays: 1, wantOnlyHere: ["The Bear"] }))).toEqual({
      kind: "early",
      headline: "Too early to tell",
      reasons: [
        "We've been counting for 1 day. Check back in 13 days.",
        "The Bear from your Want to watch list is only on Disney Plus.",
      ],
    });
  });

  it("keeps a lightly used service for now when something you want is only there", () => {
    expect(checkService(facts({ daysUsed: 2, wantOnlyHere: ["A", "B"] }))).toEqual({
      kind: "keep",
      headline: "Keep for now",
      reasons: [
        "You used it on 2 days in the last 30 days.",
        "A and B from your Want to watch list are only on Disney Plus.",
      ],
    });
  });

  it("flags light use when nothing you want needs it", () => {
    const v = checkService(facts({ daysUsed: 1, wantHere: ["Paddington"] }));
    expect(v.kind).toBe("review");
    expect(v.headline).toBe("Light use");
    expect(v.reasons.slice(0, 2)).toEqual([
      "You used it on 1 day in the last 30 days.",
      "Everything on your Want to watch list that's on Disney Plus is also free or on your other services.",
    ]);
  });

  it("suggests watching what's only there, then pausing", () => {
    expect(checkService(facts({ wantOnlyHere: ["The Bear"] }))).toMatchObject({
      kind: "review",
      headline: "Watch The Bear, then pause it",
    });
    expect(checkService(facts({ wantOnlyHere: ["A", "B", "C"] }))).toMatchObject({
      kind: "review",
      headline: "Use it or pause it",
    });
  });

  it("suggests pausing an unused service that nothing on your list needs", () => {
    expect(checkService(facts({ trackedDays: 20 }))).toEqual({
      kind: "pause",
      headline: "Consider pausing",
      reasons: [
        "You haven't used it in the last 20 days.",
        "Nothing on your Want to watch list is on Disney Plus.",
        "You can rejoin any time.",
      ],
    });
    // Without the list, it says only what it knows.
    expect(checkService(facts({ listChecked: false })).reasons).toEqual([
      "You haven't used it in the last 30 days.",
      "You can rejoin any time.",
    ]);
  });
});

describe("check-up facts", () => {
  const list = [
    { key: "tv:136315", title: "The Bear", status: "want" as const },
    { key: "movie:116149", title: "Paddington", status: "want" as const },
    { key: "movie:1", title: "Watching Film", status: "watching" as const },
  ];
  const availability = {
    "tv:136315": { providers: [337], free: false },
    "movie:116149": { providers: [8, 38], free: true },
    "movie:1": { providers: [8, 337], free: false },
  };
  const base = {
    usage: recordUse({ ...EMPTY_USAGE, since: "2026-09-01" }, 8, TODAY),
    today: TODAY,
    myServices: [8, 337],
    list,
    availability,
    free: false,
  };

  it("works out what each service is needed for", () => {
    expect(factsFor({ ...base, providerId: 337, name: "Disney Plus" })).toEqual({
      name: "Disney Plus",
      free: false,
      trackedDays: 48,
      daysUsed: 0,
      listChecked: true,
      watchingHere: ["Watching Film"],
      wantHere: ["The Bear"],
      wantOnlyHere: ["The Bear"],
    });
    // Paddington is free on BBC iPlayer, so Netflix isn't needed for it.
    expect(factsFor({ ...base, providerId: 8, name: "Netflix" })).toMatchObject({
      daysUsed: 1,
      wantHere: ["Paddington"],
      wantOnlyHere: [],
    });
  });

  it("isn't 'only here' when another of your services has it", () => {
    const shared = { ...availability, "tv:136315": { providers: [337, 8], free: false } };
    expect(
      factsFor({ ...base, availability: shared, providerId: 337, name: "Disney Plus" })
        .wantOnlyHere,
    ).toEqual([]);
  });

  it("knows nothing about the list when the lookup failed", () => {
    expect(
      factsFor({ ...base, availability: null, providerId: 337, name: "Disney Plus" }),
    ).toMatchObject({ listChecked: false, wantHere: [], wantOnlyHere: [], watchingHere: [] });
  });
});

describe("availability lookup", () => {
  it("accepts only film/show keys, de-duplicated and capped", () => {
    expect(titleKeysSchema.parse("movie:116149,tv:136315,movie:116149")).toEqual([
      "movie:116149",
      "tv:136315",
    ]);
    for (const bad of ["", "person:1", "movie:0", "movie:abc", "tv:1;drop"]) {
      expect(titleKeysSchema.safeParse(bad).success).toBe(false);
    }
    const tooMany = Array.from({ length: MAX_CHECKED_TITLES + 1 }, (_, i) => `movie:${i + 1}`);
    expect(titleKeysSchema.safeParse(tooMany.join(",")).success).toBe(false);
  });

  it("says where each title streams, and whether it's free", async () => {
    expect(await streamingFor(["tv:136315", "movie:116149", "movie:10142"], "GB")).toEqual({
      "tv:136315": { providers: [337], free: false },
      // BBC iPlayer is in data/free-services.yaml.
      "movie:116149": { providers: [8, 38], free: true },
      "movie:10142": { providers: [], free: false },
    });
    expect(await streamingFor(["movie:116149"], "BG")).toEqual({
      "movie:116149": { providers: [8, 9], free: false },
    });
  });

  it("leaves out titles it couldn't look up, unless all failed", async () => {
    server.use(
      http.get("*/tv/1/watch/providers", () =>
        HttpResponse.json({ status_message: "Not found" }, { status: 404 }),
      ),
    );
    expect(await streamingFor(["tv:136315", "tv:1"], "GB")).toEqual({
      "tv:136315": { providers: [337], free: false },
    });
    await expect(streamingFor(["tv:1"], "GB")).rejects.toThrow(TmdbError);
  });
});
