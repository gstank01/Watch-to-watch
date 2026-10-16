@AGENTS.md

# WhatToWatch: notes for coding agents

- The full product/technical spec is in `docs/SPEC.md`. Build milestones in order (section 11);
  don't start the next one until the current one's acceptance criteria pass.
- Next.js 16 with **Cache Components off** (`cacheComponents: false`): TMDB responses are cached
  with `fetch(..., { next: { revalidate } })` in `lib/tmdb/client.ts`. Lifetimes are in `CACHE`.
- All TMDB access goes through `lib/tmdb/` (`server-only`, zod-validated).
- Tests: Vitest in `tests/unit`, Playwright in `tests/e2e`. TMDB is mocked by the MSW handlers in
  `tests/mocks/handlers.ts`, shared by unit tests (`msw/node`) and e2e (`tests/mocks/server.ts`).
  Add fixtures there rather than calling the real API.
- In the cloud sandbox, run e2e with `PLAYWRIGHT_CHROMIUM_EXECUTABLE=/opt/pw-browsers/chromium`.
- Accounts are optional (`lib/auth/status.ts`): the app must keep working with no database.
  Better Auth + Prisma 7 (client generated to `lib/generated/prisma`, driver adapter in
  `lib/db.ts`). After editing `prisma/schema.prisma`, run `npm run db:migrate`.
- Accounts e2e tests need Postgres via `E2E_DATABASE_URL` (skipped otherwise). In the sandbox,
  Postgres 16 is installed but won't run as root: `su postgres -c ".../pg_ctl -D <dir> start"`
  with a data dir the `postgres` user owns (e.g. under `/var/lib/postgresql`).
- Before pushing: `npm run lint && npm run format:check && npm run typecheck && npm test &&
npm run build && npm run test:e2e`.
