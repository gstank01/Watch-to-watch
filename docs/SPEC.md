# WhatToWatch — Product & Technical Spec

> A free, non-commercial web app that helps people find something to watch across every streaming service. It favours services the user already has and free options, and makes free trials painless by reminding users to cancel before they're charged.

This spec is written for an AI coding agent (Claude Code) to build the project incrementally. Build one milestone at a time, in order. Each milestone ends in a working, deployable app with passing tests.

---

## 1. Goals and non-goals

### Goals
1. **Find it fast.** Search any film or TV show and see where it's streaming in the user's country.
2. **Use what you have.** Users tick the services they already pay for. Results available on those services come first.
3. **Free first.** Always show free options (BBC iPlayer, ITVX, Channel 4, free ad-supported services) before suggesting a paid service.
4. **Browse without a title in mind.** Filter by mood/genre, runtime, film vs series, and "on my services / free only".
5. **Try without getting stuck.** Show current free trials, suggest when a trial is worth it, and remind users to cancel before the trial ends.
6. **Watchlist.** Save titles and get notified when one becomes available on the user's services or for free.

### Non-goals (do not build)
- No affiliate links, ads, tracking pixels or monetisation of any kind.
- No signing users up to streaming services or handling their payments. We only link out to the service's own site.
- No storing streaming-service passwords or credentials.
- No scraping of streaming sites. Use the TMDB API only.
- No native mobile apps (the web app must be responsive and work well on phones).

---

## 2. Users and key flows

**Anonymous visitor (no account)**
- Search titles, browse, see where to watch.
- Pick "my services" (saved in browser localStorage, wrapped in try/catch).
- View the free trials page.
- Start a trial reminder by downloading a calendar file (.ics). No account needed.

**Signed-in user (email magic link, no passwords)**
- Everything above, with "my services" saved to their account.
- Watchlist with availability alerts by email.
- Trial tracker with email reminders.

### Flow A: Search → watch
1. User types "The Bear" in the search box.
2. Autocomplete shows matching films/shows with poster and year.
3. Title page shows, grouped in this order:
   1. **On your services** (highlighted)
   2. **Free** (free + ad-supported)
   3. **Free trial available** (subscription services with an active trial in `data/trials.yaml`)
   4. **Other subscriptions**
   5. **Rent / buy** (collapsed by default)
4. Each provider row has a "Watch on X" button linking straight to the provider: its own search for the title, or its home page, from `data/provider-links.yaml`. TMDB's page for the title is only the fallback for providers not in that file. *(Changed at the owner's request: originally TMDB's JustWatch link, which sent users through TMDB first.)*

### Flow B: Browse
1. User opens Browse and picks filters: mood/genre, film or series, max runtime, "my services only", "free only", sort (popular / top rated / newest).
2. Results grid with poster, title, year, rating, and small provider logos.

### Flow C: Free trial with reminder
1. On the trials page or a title page, user clicks "Start free trial" for Paramount+ (7 days).
2. Modal: "We'll remind you to cancel on **[trial end − 2 days]**." Options:
   - **Signed in:** "Remind me by email" → creates a Trial record.
   - **Anonymous:** "Add to my calendar" → downloads an .ics file with a reminder event.
3. App opens the provider's sign-up page in a new tab.
4. On reminder day, email says: "Your Paramount+ trial ends on [date]. Cancel here: [cancel URL]. Still watching? Keep it, no action needed."
5. User can mark the trial as "Cancelled" or "Kept" from the email or the dashboard.

### Flow D: "Worth a trial this month"
- On the dashboard, for each service with an active trial that the user doesn't have: count watchlist titles available on it. If there are 2 or more, show a card: "Start a 7-day Paramount+ trial to watch 3 things on your watchlist."

### Flow E: Watchlist alerts
- Daily job checks availability for all watchlisted titles.
- If a title newly appears on one of the user's services, or becomes free, send one digest email per user per day (never one email per title).

---

## 3. Tech stack

| Concern | Choice |
|---|---|
| Framework | Next.js (App Router), TypeScript, React Server Components |
| Styling | Tailwind CSS; accessible, responsive, light/dark mode |
| Database | PostgreSQL via Prisma |
| Auth | ~~Auth.js (NextAuth)~~ **Better Auth** magic-link plugin *(changed: Auth.js is now maintained by the Better Auth team, who recommend Better Auth for new projects; Auth.js v5 never left beta. Same design: email magic link, no passwords.)* |
| Email | Resend (abstract behind an `EmailSender` interface so it can be swapped) |
| Scheduled jobs | Vercel Cron hitting protected API routes (secret header) |
| Data source | TMDB API v3 (search, details, discover, watch providers) |
| Testing | Vitest (unit), Playwright (end-to-end), MSW to mock TMDB |
| Lint/format | ESLint + Prettier |
| CI | GitHub Actions: lint, typecheck, unit tests, e2e on PRs |
| Hosting | Vercel + a hosted Postgres (Neon or Supabase) |

Use the latest stable versions of each at build time.

---

## 4. External data: TMDB

TMDB is free for non-commercial use with attribution. Its watch-provider data comes from JustWatch, and **JustWatch must also be credited** wherever provider data is shown.

Endpoints used (v3, bearer token auth):

| Purpose | Endpoint |
|---|---|
| Search | `GET /search/multi?query=&region=` (filter to `movie` and `tv`) |
| Title details | `GET /movie/{id}`, `GET /tv/{id}` |
| Where to watch | `GET /movie/{id}/watch/providers`, `GET /tv/{id}/watch/providers` → use `results[REGION]` |
| Provider list | `GET /watch/providers/movie?watch_region=`, `GET /watch/providers/tv?watch_region=` |
| Browse | `GET /discover/movie`, `GET /discover/tv` with `watch_region`, `with_watch_providers` (pipe-separated = OR), `with_watch_monetization_types` (`flatrate`, `free`, `ads`, `rent`, `buy`), `with_genres`, `with_runtime.lte`, `sort_by` |
| Genres | `GET /genre/movie/list`, `GET /genre/tv/list` |

Rules:
- All TMDB calls happen **server-side only**. The API token never reaches the browser.
- Wrap TMDB in a typed client module (`lib/tmdb/`) with zod-validated responses.
- Cache responses: provider lists and genres for 24h; details and watch providers for 6h; search for 1h. Use Next.js fetch caching and revalidation.
- Respect rate limits: retry with backoff on HTTP 429.
- Default region `GB`. Users can change region (all TMDB-supported regions).

### Mood mapping
Moods are friendly labels mapped to TMDB genre IDs, defined in `data/moods.ts`:

| Mood | Genres |
|---|---|
| Make me laugh | Comedy |
| Edge of my seat | Thriller, Crime, Mystery |
| Feel-good | Comedy, Family, Romance, Animation |
| Big and epic | Action, Adventure, Science Fiction, Fantasy |
| Learn something | Documentary, History |
| Scare me | Horror |
| Cry a little | Drama, Romance |

Note that TV genre IDs differ from movie IDs (e.g. TV uses "Action & Adventure"). Map moods per media type.

---

## 5. Curated data: free trials and free services

Trial offers have no reliable API, so they live in the repo as reviewed data. Anyone can propose updates via pull request.

### `data/trials.yaml`
```yaml
# One entry per provider per region. Verify every entry before launch
# and at least monthly. Entries with last_verified older than 45 days
# are hidden from the UI and flagged by the stale-data CI check.
- provider_id: 9          # TMDB provider id (Amazon Prime Video)
  provider_name: Amazon Prime Video
  region: GB
  trial_days: 30
  eligibility: New members only
  signup_url: https://www.amazon.co.uk/...
  cancel_url: https://www.amazon.co.uk/...
  price_after_trial: "£X.XX/month"
  notes: ""
  last_verified: 2026-10-16
```

Seed the GB file with these services (look up current TMDB provider IDs and URLs, and verify each trial against the provider's own website before launch):
- Amazon Prime Video: 30 days
- Apple TV+: 7 days
- Paramount+: 7 days
- NOW Entertainment: 7 days
- MUBI: 7 days
- BFI Player: 14 days
- BritBox: 7 days (reported as possibly discontinued for direct web sign-up; verify)
- Disney+: no trial (include with `trial_days: 0` so the UI can say "No free trial")

### `data/free-services.yaml`
Lists providers that are free in a region (e.g. BBC iPlayer, ITVX, Channel 4, plus free ad-supported services). Used to classify providers as "Free" even when TMDB lists them as `flatrate`. Include a `notes` field (e.g. "Live TV needs a TV Licence").

### Validation
- A zod schema validates both files at build time. The build fails on invalid data.
- A CI job warns (doesn't fail) on entries with `last_verified` older than 45 days, and opens or updates a GitHub issue listing them.

---

## 6. Data model (Prisma)

```prisma
model User {
  id            String     @id @default(cuid())
  email         String     @unique
  region        String     @default("GB")
  emailAlerts   Boolean    @default(true)
  createdAt     DateTime   @default(now())
  services      UserService[]
  watchlist     WatchlistItem[]
  trials        Trial[]
  // plus Auth.js Account / Session / VerificationToken models
}

model UserService {
  userId      String
  providerId  Int        // TMDB provider id
  user        User       @relation(fields: [userId], references: [id], onDelete: Cascade)
  @@id([userId, providerId])
}

model WatchlistItem {
  id          String     @id @default(cuid())
  userId      String
  tmdbId      Int
  mediaType   MediaType
  favourite   Boolean    @default(false)
  status      WatchStatus?             // null = favourite only
  addedAt     DateTime   @default(now())
  updatedAt   DateTime   @updatedAt
  user        User       @relation(fields: [userId], references: [id], onDelete: Cascade)
  @@unique([userId, tmdbId, mediaType])
}

model AvailabilitySnapshot {
  tmdbId      Int
  mediaType   MediaType
  region      String
  providers   Json       // { flatrate: number[], free: number[], ads: number[], rent: number[], buy: number[] }
  checkedAt   DateTime
  @@id([tmdbId, mediaType, region])
}

model Trial {
  id          String      @id @default(cuid())
  userId      String
  providerId  Int
  region      String
  startedOn   DateTime    @db.Date
  endsOn      DateTime    @db.Date
  remindOn    DateTime    @db.Date   // endsOn - 2 days (or startedOn if trial < 3 days)
  status      TrialStatus @default(ACTIVE)
  remindedAt  DateTime?
  user        User        @relation(fields: [userId], references: [id], onDelete: Cascade)
}

enum MediaType   { MOVIE TV }
enum WatchStatus { WANT WATCHING WATCHED }
enum TrialStatus { ACTIVE CANCELLED KEPT EXPIRED }
```

---

## 7. Pages and routes

| Route | Purpose |
|---|---|
| `/` | Hero search, "My services" picker prompt, popular now on my services, current free trials strip |
| `/search?q=` | Search results |
| `/movie/[id]`, `/tv/[id]` | Title page with grouped where-to-watch (Flow A), add to watchlist, start trial |
| `/browse` | Filters + results grid (Flow B). Filters stored in the URL query string so links are shareable |
| `/trials` | All current free trials for the region, with "Start trial" buttons |
| `/services` | Pick my services (logo grid with search) |
| `/dashboard` | (signed in) Watchlist, active trials with countdowns, "Worth a trial" cards |
| `/settings` | Region, email alerts on/off, delete account (hard delete, immediate) |
| `/about` | What the app is, that it's non-commercial, TMDB + JustWatch attribution, privacy summary |

### API routes
| Route | Method | Notes |
|---|---|---|
| `/api/search` | GET | Autocomplete; debounced client calls; returns top 8 |
| `/api/services` | GET/PUT | Get/replace user's services |
| `/api/watchlist` | GET/POST/DELETE | |
| `/api/trials` | GET/POST/PATCH | PATCH to set status |
| `/api/trials/ics` | GET | Generates .ics for anonymous reminders (params: provider, region, start date) |
| `/api/trials/[id]/status?token=` | GET | One-click status link from email (signed, expiring token) |
| `/api/cron/trial-reminders` | POST | Daily 08:00 UK time. Sends reminders where `remindOn <= today` and `remindedAt` is null; marks trials `EXPIRED` after `endsOn` |
| `/api/cron/watchlist-check` | POST | Daily. Refreshes snapshots for watchlisted titles, diffs, sends one digest per user |

Cron routes require an `Authorization: Bearer ${CRON_SECRET}` header.

---

## 8. Core logic (unit-test all of these)

1. **Provider grouping** (`lib/availability/group.ts`): given TMDB providers + user services + free-services list + trials data, return the ordered groups from Flow A. A provider appears only in its highest-priority group.
2. **Reminder date** (`lib/trials/dates.ts`): `endsOn = startedOn + trialDays`; `remindOn = endsOn − 2 days`, never earlier than `startedOn`. All dates computed in Europe/London (or the user's region timezone) to avoid off-by-one errors around midnight and BST changes.
3. **ICS generation** (`lib/trials/ics.ts`): valid RFC 5545 all-day event on `remindOn` with a display alarm, title "Cancel [Provider] trial", description containing the cancel URL.
4. **Worth-a-trial** (`lib/trials/suggest.ts`): Flow D rules; ignore providers the user already has and trials with `trial_days: 0`; sort by number of watchlist matches, then trial length.
5. **Availability diff** (`lib/watchlist/diff.ts`): returns titles newly available on user services or newly free compared with the previous snapshot.
6. **Stale trial filter**: entries older than 45 days are excluded from the UI.

---

## 9. Non-functional requirements

- **Accessibility:** WCAG 2.2 AA. Keyboard navigation, focus states, alt text on posters, colour contrast checked in both themes.
- **Performance:** Title and browse pages server-rendered; LCP under 2.5s on mid-range mobile. Use `next/image` for TMDB posters.
- **Privacy:** Collect only email, region, services, watchlist and trials. No analytics cookies. Plain-language privacy page. Account deletion removes all data immediately. Never log email addresses.
- **Security:** Server-only secrets, signed email action tokens (expire after 7 days), rate-limit auth and API routes, CSRF protection via Auth.js defaults.
- **Email:** Every email has a one-click unsubscribe and states why it was sent.
- **Resilience:** If TMDB is down, show cached data with a "last updated" note; never show a blank page.

---

## 10. Project structure

```
/app                 Next.js routes (pages + api)
/components          UI components
/lib
  /tmdb              Typed TMDB client, zod schemas, caching
  /availability      Grouping logic
  /trials            Dates, ICS, suggestions, data loader
  /watchlist         Diff + digest
  /email             EmailSender interface, Resend impl, templates
/data                trials.yaml, free-services.yaml, moods.ts
/prisma              schema.prisma, migrations, seed.ts
/tests
  /unit
  /e2e
/.github/workflows   ci.yml, stale-trials.yml
README.md            Setup, env vars, how to update trial data
CONTRIBUTING.md      How to submit trial-data PRs (with source link + date checked)
```

### Environment variables (`.env.example`)
```
TMDB_API_TOKEN=
DATABASE_URL=
AUTH_SECRET=
AUTH_URL=
RESEND_API_KEY=
EMAIL_FROM=
CRON_SECRET=
DEFAULT_REGION=GB
```

---

## 11. Milestones

Build in order. Don't start the next milestone until the current one's acceptance criteria pass.

### M1: Search and where to watch (no accounts)
- Project scaffold, Tailwind, ESLint/Prettier, Vitest, Playwright, CI workflow.
- TMDB client with caching and mocked tests.
- Home, search, title pages, region switcher.
- "My services" picker stored in localStorage; provider grouping (Flow A) using `free-services.yaml`.
- About page with TMDB and JustWatch attribution.

**Accept when:** searching "The Bear" shows correct GB providers grouped as in Flow A; selecting a service moves it to "On your services"; e2e tests pass with TMDB mocked.

### M2: Browse
- `/browse` with mood, media type, runtime, "my services only", "free only", sort; URL-synced filters; infinite scroll or pagination.

**Accept when:** "Make me laugh + under 90 min + my services only" returns only matching titles available on the selected services.

### M3: Free trials (no accounts)
- `trials.yaml` + validation + stale filter; `/trials` page; trial badges on title pages.
- "Start free trial" modal with .ics download.
- Stale-trials GitHub workflow.

**Accept when:** downloaded .ics imports correctly into Google Calendar and Apple Calendar with the right date; invalid YAML fails the build.

### M4: Accounts, watchlist, trial tracker

> **Progress (built early, at the owner's request):** Postgres + Prisma, magic-link sign-in, settings with sign out and account deletion, and My list + services saved to the account and synced across devices (first sign-in merges the browser's data; then the account is the source of truth). Still to do: region and email-alert settings, trial records, reminder cron and emails.
- Postgres + Prisma, Auth.js magic link, settings, account deletion.
- Sync localStorage services and My list (favourites + watch status) into the account on first sign-in.
- Watchlist, dashboard, trial records, trial reminder cron + emails with one-click status links.

**Accept when:** a trial started today with 7 days produces a reminder email on day 5 (tested with a fake clock); unsubscribe and delete account work.

### M5: Smart suggestions and alerts
- "Worth a trial" cards (Flow D).
- Watchlist availability cron + daily digest (Flow E).

**Accept when:** unit tests cover the diff and suggestion rules; a title moving onto a user's service triggers exactly one digest entry.

---

## 12. Open questions (decide before or during build)
1. App name and domain (placeholder: WhatToWatch).
2. Which regions to support at launch: GB only, or all TMDB regions with trial data only for GB?
3. Who maintains `trials.yaml` monthly, and should we accept community PRs from day one?
4. ~~Should anonymous users be able to keep a watchlist in localStorage, or is the watchlist account-only?~~ **Decided: yes.** "My list" (favourites plus Want to watch / Watching / Watched) was added early, before M2, at the owner's request. It lives in localStorage (`wtw:library:v1`) and moves into the account in M4. Availability alerts (Flow E) still need an account.

---

## 13. Future work

Ideas the owner has looked at and set aside for now. Don't build these without a new decision.

- **Find my subscriptions automatically** (shelved 2026-10-18). With the visitor's permission (e.g. Google sign-in plus read-only Gmail access), scan their inbox for recent receipts from streaming services, including Apple and Google billing receipts, and suggest the matches for My services. Only the services found would be kept, never the emails, and the visitor would confirm the matches first.
  - Why shelved: Gmail read access is a restricted scope, so a public app needs Google's paid annual security assessment; until then it's limited to 100 named test users. It also changes the app's privacy promise.
  - Ruled out: asking the services directly by email (no such API, and probing sign-up or reset pages would break their terms and let anyone check someone else's email); reading bank payments via Open Banking (too sensitive and regulated for this app).
- **Publish on Google Play** (not started; decide the web address first). Package the site as an Android app with a Trusted Web Activity (Google's Bubblewrap tool or PWABuilder): full screen, own icon, no address bar, same code, site updates reach the app at once.
  - App work (about a day): web app manifest, Android icon sizes, an offline page, `/.well-known/assetlinks.json` for link verification (works on the `.vercel.app` address), a separate privacy policy page, the Android package.
  - Owner work: Play developer account (one-off US$25, identity check); closed test with at least 12 testers for 14 consecutive days (required for new personal accounts); store listing, content rating, Data safety form.
  - The app is tied to one web address, so pick the final domain before publishing.
  - Changes the non-goal "no native mobile apps" (§1): a Trusted Web Activity is still the web app, but record the change when it's built.
