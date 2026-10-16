import "server-only";
import { TmdbError } from "./client";

const SETUP_MISSING =
  "Site setup problem: the server has no TMDB API token. Set TMDB_API_TOKEN (see the README) and restart the server.";
const SETUP_WRONG_KEY =
  "Site setup problem: TMDB_API_TOKEN is the short “API Key”. Use the long “API Read Access Token” from your TMDB API settings, then restart the server.";
const SETUP_REJECTED =
  "Site setup problem: TMDB rejected the API token. Check TMDB_API_TOKEN is the long “API Read Access Token” (not the short API key), then restart the server.";
const UNREACHABLE =
  "We can't reach our film data source (TMDB) right now. Please try again shortly.";
const UNAVAILABLE =
  "Our film data source (TMDB) isn't responding properly right now. Please try again shortly.";

/** A plain-English message for a failed TMDB call. Setup problems say how to fix them. */
export function tmdbProblemMessage(err: unknown): string {
  if (!(err instanceof TmdbError)) return UNAVAILABLE;
  switch (err.kind) {
    case "config":
      return err.message.includes("v3 API key") ? SETUP_WRONG_KEY : SETUP_MISSING;
    case "auth":
      return SETUP_REJECTED;
    case "network":
      return UNREACHABLE;
    default:
      return UNAVAILABLE;
  }
}

/**
 * Logs a failed TMDB call to the server log (terminal locally, Runtime Logs on
 * Vercel) and returns the message to show. Messages never contain the token.
 */
export function reportTmdbError(err: unknown, context: string): string {
  const detail = err instanceof Error ? err.message : String(err);
  console.error(`[tmdb] ${context}: ${detail}`);
  return tmdbProblemMessage(err);
}
