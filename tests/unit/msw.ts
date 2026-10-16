import { setupServer } from "msw/node";
import { afterAll, afterEach, beforeAll } from "vitest";
import { handlers } from "../mocks/handlers";

/** Starts an MSW server with the TMDB handlers for the current test file. */
export function setupTmdbMock() {
  const server = setupServer(...handlers);
  beforeAll(() => {
    process.env.TMDB_API_TOKEN = "test-token";
    delete process.env.TMDB_API_BASE_URL;
    server.listen({ onUnhandledFrame: "error" });
  });
  afterEach(() => server.resetHandlers());
  afterAll(() => server.close());
  return server;
}
