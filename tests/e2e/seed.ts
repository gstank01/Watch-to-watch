import type { Page } from "@playwright/test";
import { addDays, localDay } from "../../lib/checkup/usage";

const entry = (id: number, mediaType: "movie" | "tv", title: string, status: string) => ({
  id,
  mediaType,
  title,
  year: null,
  posterPath: null,
  favourite: false,
  status,
  rating: null,
  updatedAt: "2026-10-16T10:00:00.000Z",
});

/**
 * Someone who has counted for 40 days: Netflix, Disney Plus and BBC iPlayer;
 * The Bear (only on Disney Plus) and Paddington (Netflix, and free on iPlayer)
 * on Want to watch; Netflix used on 5 recent days, Disney Plus not at all.
 */
export async function seedCheckup(page: Page) {
  const today = localDay();
  const data = {
    "wtw:services:v1": [8, 337, 38],
    "wtw:library:v1": {
      "tv:136315": entry(136315, "tv", "The Bear", "want"),
      "movie:116149": entry(116149, "movie", "Paddington", "want"),
    },
    "wtw:usage:v1": {
      counting: true,
      since: addDays(today, -39),
      days: { "8": [1, 3, 6, 10, 20].map((n) => addDays(today, -n)).sort() },
      prices: {},
    },
  };
  // Any page will do: storage belongs to the site, not the page.
  await page.goto("/about");
  await page.evaluate((items) => {
    for (const [key, value] of Object.entries(items)) {
      window.localStorage.setItem(key, JSON.stringify(value));
    }
  }, data);
}
