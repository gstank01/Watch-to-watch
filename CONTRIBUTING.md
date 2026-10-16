# Contributing

Thanks for helping. WhatToWatch is free and non-commercial; please keep it that
way: no ads, affiliate links, tracking or scraping (TMDB API only).

## Updating curated data

Some facts have no reliable API, so they live in `data/` as reviewed YAML:

- `data/free-services.yaml`: providers that are free to watch in a region
  (BBC iPlayer, ITVX, Channel 4 …). TMDB often lists these as subscriptions;
  this file makes the app show them as **Free**.
- `data/provider-links.yaml`: where each "Watch on …" button goes, the service's own search
  for the title (`search_url` with `{query}`) or its home page. Only add a `search_url` after
  opening it in a browser with a real title and seeing that service's results. Never add
  affiliate or tracking parameters.
- `data/trials.yaml` (coming in milestone 3): free-trial offers.

When you open a pull request that changes these files, please include:

1. **A source link**: the provider's own page that shows the fact (not a news
   article or a deals site).
2. **The date you checked it.**
3. For a new provider, its **TMDB provider id**. Find it with
   `GET /watch/providers/tv?watch_region=GB`, or run
   `TMDB_API_TOKEN=... npm run verify-providers` to check every id in the file.

`npm run validate-data` checks the files against their schema. CI runs it,
and an invalid file fails the build.

## Code changes

```bash
npm ci
npm run lint && npm run format:check && npm run typecheck && npm test
npm run build && npm run test:e2e
```

- Keep TMDB calls server-side (`lib/tmdb/`). The token must never reach the browser.
- Put business rules in `lib/` as pure functions with unit tests.
- Pages must work with keyboard only and pass the axe checks in `tests/e2e/a11y.spec.ts`.
