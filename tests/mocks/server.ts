/**
 * A stand-alone mock TMDB API for end-to-end tests, serving the same MSW
 * handlers the unit tests use. Point the app at it with
 * TMDB_API_BASE_URL=http://localhost:4010/3.
 */
import { createServer } from "node:http";
import { getResponse } from "msw";
import { handlers } from "./handlers";

const port = Number(process.env.MOCK_TMDB_PORT ?? 4010);

createServer(async (req, res) => {
  const url = new URL(req.url ?? "/", `http://localhost:${port}`);
  const headers = new Headers();
  for (const [key, value] of Object.entries(req.headers)) {
    if (typeof value === "string") headers.set(key, value);
  }
  const response = await getResponse(handlers, new Request(url, { method: req.method, headers }));
  if (!response) {
    res.writeHead(404, { "content-type": "application/json" });
    res.end(JSON.stringify({ status_message: `No mock for ${req.method} ${url.pathname}` }));
    return;
  }
  res.writeHead(response.status, Object.fromEntries(response.headers));
  res.end(Buffer.from(await response.arrayBuffer()));
}).listen(port, () => console.log(`Mock TMDB listening on http://localhost:${port}`));
