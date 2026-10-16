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

| Milestone                                   | Status      |
| ------------------------------------------- | ----------- |
| M1: Search and where to watch (no accounts) | ✅ Done     |
| M2: Browse                                  | Not started |
| M3: Free trials (no accounts)               | Not started |
| M4: Accounts, watchlist, trial tracker      | Not started |
| M5: Smart suggestions and alerts            | Not started |

### What M1 includes

- Search with autocomplete (`/api/search`, debounced, keyboard accessible) and a full results page.
- Title pages (`/movie/[id]`, `/tv/[id]`) with where-to-watch grouped as **On your services →
  Free → Free trial available → Other subscriptions → Rent / buy** (rent/buy collapsed).
- "My services" picker (`/services`), stored in `localStorage` (every access wrapped in
  try/catch, with an in-memory fallback).
- Country picker in the header: 🇬🇧 United Kingdom and 🇧🇬 Bulgaria. First visit uses the
  visitor's country (Vercel's `x-vercel-ip-country` header) when supported, else `DEFAULT_REGION`;
  the visitor's own choice is saved in a cookie and always wins.
- Home page: hero search, services prompt, popular on your services, popular in your region.
- About page with TMDB and JustWatch attribution and a plain-English privacy summary.
- Typed, zod-validated TMDB client with caching and retry/backoff on 429.
- `data/free-services.yaml`, schema-validated at build time.
- Posters and logos are served from the app's own domain through Next.js image optimization
  (`/_next/image`), so they show even where `image.tmdb.org` is blocked; a title or initials
  replace any image that still fails.
- "Watch on …" buttons go straight to each service (its own search for the title, or its home
  page) using `data/provider-links.yaml`; TMDB's page is only a fallback.

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

| Name                           | Needed from | Purpose                                                           |
| ------------------------------ | ----------- | ----------------------------------------------------------------- |
| `TMDB_API_TOKEN`               | M1          | TMDB bearer token. Server-side only.                              |
| `TMDB_API_BASE_URL`            | tests       | Overrides the TMDB base URL (the e2e tests point it at the mock). |
| `DEFAULT_REGION`               | M1          | Region for visitors outside a supported country. `GB` or `BG`.    |
| `DATABASE_URL`                 | M4          | Postgres connection string.                                       |
| `AUTH_SECRET`, `AUTH_URL`      | M4          | Auth.js.                                                          |
| `RESEND_API_KEY`, `EMAIL_FROM` | M4          | Email.                                                            |
| `CRON_SECRET`                  | M4          | Bearer secret for cron routes.                                    |

## Scripts

| Command                                                  | What it does                                                                        |
| -------------------------------------------------------- | ----------------------------------------------------------------------------------- |
| `npm run dev`                                            | Dev server                                                                          |
| `npm run build`                                          | Validates `data/*.yaml`, then builds                                                |
| `npm run lint` / `format` / `format:check` / `typecheck` | Code quality                                                                        |
| `npm test`                                               | Unit tests (Vitest, TMDB mocked with MSW)                                           |
| `npm run test:e2e`                                       | Playwright against the production build and a mock TMDB. Run `npm run build` first. |
| `npm run validate-data`                                  | Validates the curated YAML files                                                    |
| `npm run verify-providers`                               | Checks provider ids in the data files against the live TMDB API                     |

The e2e suite runs on desktop and mobile viewports and includes axe WCAG 2.2 AA checks in light
and dark mode.

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
4. Should anonymous users be able to keep a watchlist in localStorage?

## Licence

Not yet chosen.
