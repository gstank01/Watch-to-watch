# WhatToWatch

A free, non-commercial web app that helps people find something to watch across
every streaming service. It puts the services you already have and free options
first, and (soon) makes free trials painless by reminding you to cancel before
you're charged.

Film and TV data from [TMDB](https://www.themoviedb.org/). Streaming
availability from [JustWatch](https://www.justwatch.com/) via TMDB. This product
uses the TMDB API but is not endorsed or certified by TMDB.

The spec lives in [`docs/SPEC.md`](docs/SPEC.md).

## Status

| Milestone                                   | Status                                          |
| ------------------------------------------- | ----------------------------------------------- |
| M1: Search and where to watch (no accounts) | ✅ Done                                         |
| M2: Browse                                  | Not started                                     |
| M3: Free trials (no accounts)               | Not started                                     |
| M4: Accounts, watchlist, trial tracker      | Partly: accounts and My list ✅, trials to come |
| M5: Smart suggestions and alerts            | Not started                                     |

### What's built

- Search with autocomplete (`/api/search`, debounced, keyboard accessible) and a full results page.
- Title pages (`/movie/[id]`, `/tv/[id]`) with where-to-watch grouped as **On your services →
  Free → Free trial available → Other subscriptions → Rent / buy** (rent/buy collapsed).
- "Watch on …" buttons go straight to each service (its own search for the title, or its home
  page) using `data/provider-links.yaml`; TMDB's page is only a fallback.
- "My services" picker (`/services`).
- **Service check-up** (top of `/services`): for each of your services, a suggestion to keep it
  or pause it, with the reasons. It uses how many days you used the service (a day counts when
  you press "Watch on" for one of your services, or tap "I used it today") and what's on your
  Want to watch and Watching lists (`/api/availability` says where those stream). Add what you
  pay to see the monthly total and what pausing could save. It waits two weeks before suggesting
  a pause. The counted days and prices stay in that browser only (`lib/checkup/`).
- **My list** (`/my-list`): ♥ Favourite plus Want to watch / Watching / Watched on every title
  page, with a tab per list. A title can be a favourite and have one watch status
  (`lib/library/model.ts`).
- **Ratings**: rate any film or show 1 to 5 stars on its page or from My list (keyboard and
  screen-reader friendly). Title pages show TMDB's score and the WhatToWatch community score:
  the average from signed-in users, one rating per account, shown once a title has at least 3
  ratings. Individual ratings are never shown.
- **Accounts (optional)**: "Continue with Google" and/or an emailed link, no password (`/sign-in`). My list and
  services are saved to the account and follow you to every device; `/settings` has sign out
  and immediate account deletion. Without accounts configured, everything is saved in the
  browser only.
- Country picker in the header: 🇬🇧 United Kingdom and 🇧🇬 Bulgaria. First visit uses the
  visitor's country (Vercel's `x-vercel-ip-country` header) when supported, else `DEFAULT_REGION`;
  the visitor's own choice is saved in a cookie and always wins.
- Home page: hero search, services prompt, popular on your services, popular in your region.
- About page with TMDB and JustWatch attribution and a plain-English privacy summary.
- Typed, zod-validated TMDB client with caching and retry/backoff on 429.
- Posters and logos are served from the app's own domain through Next.js image optimization
  (`/_next/image`), so they show even where `image.tmdb.org` is blocked.
- `data/free-services.yaml` and `data/provider-links.yaml`, schema-validated at build time.

### How accounts and syncing work

- Sign-in uses [Better Auth](https://www.better-auth.com/) with its magic-link plugin, Postgres via
  Prisma 7, and email through Resend behind an `EmailSender` interface (`lib/email`).
- The browser keeps a copy of My list and services so pages stay instant and work offline.
- **First sign-in in a browser:** whatever was saved there is merged into the account (newest
  change wins per title).
- **After that the account is the source of truth:** each visit loads the account's copy, so
  changes and removals made on other devices show up. Changes are saved locally at once and sent
  in the background; unsent changes wait and are retried (`lib/account/sync.ts`).
- **Signing out** removes the list from that browser, so the next person doesn't see it (and the
  check-up's counted days, which aren't synced).
- Privacy: we store the email address, services and list. Sessions don't record IP addresses or
  browsers. Account deletion is a hard delete of everything.

## Getting started

Requires Node 22+.

```bash
npm ci
cp .env.example .env.local   # then set TMDB_API_TOKEN
npm run dev
```

Get a TMDB token at <https://www.themoviedb.org/settings/api>. Use the **API Read Access Token**
(v4 bearer), not the v3 API key.

### Troubleshooting: "Site setup problem" or no films, shows or services

Every page needs TMDB. If none of them show data, the page and the server log say why:

- **"the server has no TMDB API token"**: `TMDB_API_TOKEN` isn't set. Locally, put it in
  `.env.local` in the project folder (next to `package.json`) and **restart** `npm run dev`. On
  Vercel, add it under Project → Settings → Environment Variables, then **redeploy**.
- **"TMDB_API_TOKEN is the short API Key"** or **"TMDB rejected the API token"**: you've used the
  32-character _API Key_. Copy the long **API Read Access Token** (starts with `eyJ`) from
  <https://www.themoviedb.org/settings/api> instead.
- Anything else: look for lines starting with `[tmdb]` in the terminal running the app (or Vercel →
  Logs). They say which request failed and how.

### Environment variables

| Name                                       | Needed for | Purpose                                                                                        |
| ------------------------------------------ | ---------- | ---------------------------------------------------------------------------------------------- |
| `TMDB_API_TOKEN`                           | Everything | TMDB bearer token. Server-side only.                                                           |
| `DEFAULT_REGION`                           | Optional   | Region for visitors outside a supported country. `GB` or `BG`.                                 |
| `DATABASE_URL`                             | Accounts   | Postgres connection string (Neon or Supabase).                                                 |
| `AUTH_SECRET`                              | Accounts   | 32+ random characters: `openssl rand -base64 32`.                                              |
| `AUTH_URL`                                 | Accounts   | The site's public address, e.g. `https://your-app.vercel.app`.                                 |
| `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` | Accounts   | "Continue with Google". Needs no domain or email service.                                      |
| `RESEND_API_KEY`, `EMAIL_FROM`             | Accounts   | Sends sign-in links (needs your own domain). In `npm run dev` without them, links are printed. |
| `TMDB_API_BASE_URL`                        | Tests      | Overrides the TMDB base URL (the e2e tests point it at the mock).                              |
| `CRON_SECRET`                              | Later      | Bearer secret for cron routes (M4 trial reminders, M5 alerts).                                 |

### Turning on accounts

Accounts switch on when `DATABASE_URL`, `AUTH_SECRET` and `AUTH_URL` are set, plus at least one way
to sign in: **Google** or **email links**. Until then the header has no "Sign in" link and
`/sign-in` says what's missing.

1. **Database:** create a free Postgres database at [Neon](https://neon.tech) (or Supabase) and
   copy its connection string into `DATABASE_URL`: only the part starting with `postgresql://`
   (not the `psql '…'` command). Neon's pooled address (`…-pooler…`) is fine: migrations switch to
   the direct address automatically (or set `DATABASE_URL_UNPOOLED`).
2. **Create the tables:** `npm run db:deploy` (on Vercel this runs automatically on each deploy).
3. **Secret and address:** set `AUTH_SECRET` (`openssl rand -base64 32`) and `AUTH_URL` to the
   site's address (`http://localhost:3000` locally).
4. **Continue with Google** (works on a `.vercel.app` address, no domain needed): in
   [Google Cloud Console](https://console.cloud.google.com/) create an OAuth client of type
   "Web application" with the redirect URI `<AUTH_URL>/api/auth/callback/google`, then set
   `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET`. We request only the `openid` and `email` scopes
   and keep no name, photo or Google tokens (`lib/auth/privacy.ts`).
5. **Email links** (optional; needs a domain you own): create a [Resend](https://resend.com)
   account, verify the domain, then set `RESEND_API_KEY` and `EMAIL_FROM` (e.g.
   `WhatToWatch <signin@your-domain.com>`). Locally, `npm run dev` prints sign-in links in the
   terminal instead, so you can try email links without Resend.
6. Restart the app (or redeploy on Vercel). "Sign in" appears in the header.

If someone has used both, an email link and Google with the same address end up in one account.

## Scripts

| Command                                                  | What it does                                                                        |
| -------------------------------------------------------- | ----------------------------------------------------------------------------------- |
| `npm run dev`                                            | Dev server                                                                          |
| `npm run build`                                          | Generates the Prisma client, validates `data/*.yaml`, then builds                   |
| `npm run db:migrate` / `db:deploy`                       | Create a migration after editing `prisma/schema.prisma` / apply migrations          |
| `npm run lint` / `format` / `format:check` / `typecheck` | Code quality                                                                        |
| `npm test`                                               | Unit tests (Vitest, TMDB mocked with MSW)                                           |
| `npm run test:e2e`                                       | Playwright against the production build and a mock TMDB. Run `npm run build` first. |
| `npm run validate-data`                                  | Validates the curated YAML files                                                    |
| `npm run verify-providers`                               | Checks provider ids in the data files against the live TMDB API                     |

The e2e suite runs on desktop and mobile viewports and includes axe WCAG 2.2 AA checks in light
and dark mode. The accounts tests need Postgres: set `E2E_DATABASE_URL` (CI does) to a throwaway
database; without it they're skipped. Sign-in emails are written to `.e2e-outbox/` in tests.

## Adding a country

1. Add it to `SUPPORTED_REGIONS` in `lib/region-shared.ts`.
2. Add its free services to `data/free-services.yaml` (and later its trials to `data/trials.yaml`),
   then run `npm run verify-providers`.
3. Add fixtures for it in `tests/mocks/fixtures.ts` and an e2e test.

The data files reject regions that aren't in `SUPPORTED_REGIONS`.

## Updating curated data

`data/free-services.yaml` lists providers that are free in each region, and
`data/provider-links.yaml` says where each service's "Watch on …" button goes. See
[CONTRIBUTING.md](CONTRIBUTING.md) for how to propose changes. Before launch, run
`npm run verify-providers` with a real token to confirm every provider id.

## Project layout

```
app/              Routes (pages + API)
components/       UI components
lib/tmdb/         Typed TMDB client, zod schemas, caching
lib/availability/ Where-to-watch grouping
lib/data/         Curated data loaders and schemas
lib/services/     "My services" browser store
lib/checkup/      Service check-up: counted days, keep/pause rules, list availability
data/             Curated YAML data
tests/unit        Vitest
tests/e2e         Playwright
tests/mocks       MSW handlers and fixtures for TMDB
```

## Open questions (from the spec)

1. App name and domain (placeholder: WhatToWatch).
2. Regions at launch: United Kingdom and Bulgaria. Curated free-service data is GB only so far;
   Bulgarian free services still need adding and verifying. The UI is English; Bulgarian
   translation is planned.
3. Who maintains the curated data monthly, and do we accept community PRs from day one?
4. ~~Should anonymous users be able to keep a watchlist in localStorage?~~ Yes: My list.

## Licence

Not yet chosen.
