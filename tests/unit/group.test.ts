import { describe, expect, it } from "vitest";
import { groupProviders } from "@/lib/availability/group";
import { PROVIDERS, WATCH_PROVIDERS } from "../mocks/fixtures";
import type { RegionProviders } from "@/lib/tmdb/schemas";

const gb = (key: string) =>
  (WATCH_PROVIDERS[key] as { results: Record<string, RegionProviders> }).results.GB;

const FREE_GB = [38, 41, 103];
const summary = (groups: ReturnType<typeof groupProviders>) =>
  Object.fromEntries(groups.map((g) => [g.key, g.providers.map((p) => p.name)]));

describe("groupProviders", () => {
  it("groups The Bear in GB with no services: subscription then rent/buy", () => {
    const groups = groupProviders({
      providers: gb("tv/136315"),
      userServices: [],
      freeProviderIds: FREE_GB,
    });
    expect(groups.map((g) => g.label)).toEqual(["Other subscriptions", "Rent / buy"]);
    expect(summary(groups)).toEqual({
      subscription: ["Disney Plus"],
      rentBuy: ["Apple TV", "Amazon Video", "Google Play Movies", "Rakuten TV"],
    });
  });

  it("moves a provider the user has into 'On your services'", () => {
    const groups = groupProviders({
      providers: gb("tv/136315"),
      userServices: [337],
      freeProviderIds: FREE_GB,
    });
    expect(groups[0]).toMatchObject({ key: "mine", label: "On your services" });
    expect(summary(groups)).toEqual({
      mine: ["Disney Plus"],
      rentBuy: ["Apple TV", "Amazon Video", "Google Play Movies", "Rakuten TV"],
    });
  });

  it("classifies free-services.yaml providers as Free even when TMDB says flatrate", () => {
    const groups = groupProviders({
      providers: gb("movie/116149"),
      userServices: [],
      freeProviderIds: FREE_GB,
    });
    expect(summary(groups)).toEqual({
      free: ["BBC iPlayer"],
      subscription: ["Netflix"],
      rentBuy: ["Apple TV", "Amazon Video"],
    });
  });

  it("orders groups mine > free > trial > subscription > rent/buy", () => {
    const providers: RegionProviders = {
      flatrate: [PROVIDERS.netflix, PROVIDERS.prime, PROVIDERS.disney, PROVIDERS.iplayer],
      ads: [PROVIDERS.itvx],
      buy: [PROVIDERS.appleStore],
    };
    const groups = groupProviders({
      providers,
      userServices: [8],
      freeProviderIds: [38],
      trialProviderIds: [9],
    });
    expect(groups.map((g) => g.key)).toEqual(["mine", "free", "trial", "subscription", "rentBuy"]);
    expect(summary(groups)).toEqual({
      mine: ["Netflix"],
      free: ["BBC iPlayer", "ITVX"],
      trial: ["Amazon Prime Video"],
      subscription: ["Disney Plus"],
      rentBuy: ["Apple TV"],
    });
  });

  it("puts each provider in only its highest-priority group and merges offers", () => {
    const providers: RegionProviders = {
      flatrate: [PROVIDERS.prime],
      rent: [PROVIDERS.prime, PROVIDERS.amazonVideo],
      buy: [PROVIDERS.amazonVideo],
    };
    const groups = groupProviders({ providers, userServices: [9], freeProviderIds: [] });
    const all = groups.flatMap((g) => g.providers.map((p) => p.id));
    expect(all).toEqual([9, 10]);
    expect(groups[0].providers[0].offers).toEqual(["flatrate", "rent"]);
    expect(groups[1].providers[0].offers).toEqual(["rent", "buy"]);
  });

  it("does not count rent/buy-only as 'On your services'", () => {
    const groups = groupProviders({
      providers: { rent: [PROVIDERS.amazonVideo] },
      userServices: [10],
      freeProviderIds: [],
    });
    expect(groups.map((g) => g.key)).toEqual(["rentBuy"]);
  });

  it("puts a user's free service under 'On your services'", () => {
    const groups = groupProviders({
      providers: { flatrate: [PROVIDERS.iplayer] },
      userServices: [38],
      freeProviderIds: [38],
    });
    expect(groups.map((g) => g.key)).toEqual(["mine"]);
  });

  it("ignores a trial for a free provider and returns nothing for no providers", () => {
    expect(
      groupProviders({
        providers: { flatrate: [PROVIDERS.iplayer] },
        userServices: [],
        freeProviderIds: [38],
        trialProviderIds: [38],
      }).map((g) => g.key),
    ).toEqual(["free"]);
    expect(groupProviders({ providers: {}, userServices: [], freeProviderIds: [] })).toEqual([]);
  });
});
