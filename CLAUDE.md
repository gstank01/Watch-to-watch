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
- Before pushing: `npm run lint && npm run format:check && npm run typecheck && npm test &&
npm run build && npm run test:e2e`.
