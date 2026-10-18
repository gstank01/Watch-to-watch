// Applies database migrations when DATABASE_URL is set; does nothing otherwise
// (the app then runs without accounts). Used by the Vercel build.
import { spawnSync } from "node:child_process";
import { migrationUrl } from "./db-url.mjs";

if (!process.env.DATABASE_URL) {
  console.log("No DATABASE_URL: skipping database migrations (accounts are off).");
  process.exit(0);
}

const target = migrationUrl(process.env);
if ("problem" in target) {
  console.error(`\n✗ Can't set up the database: ${target.problem}\n`);
  process.exit(1);
}

const result = spawnSync("npx", ["prisma", "migrate", "deploy"], {
  stdio: "inherit",
  env: { ...process.env, DATABASE_URL: target.url },
});
if (result.status !== 0) {
  console.error(
    [
      "",
      "✗ Couldn't set up the database tables (see the Prisma error above). Common causes:",
      "  - DATABASE_URL is from another Neon project or branch, or the password was reset.",
      "  - The Neon project is paused or deleted: open it in the Neon dashboard.",
      "  - P1001 / P1002 errors: Neon couldn't be reached or timed out; redeploy once to rule out a blip.",
      "The app's code isn't the problem: this step only creates the tables accounts need.",
      "",
    ].join("\n"),
  );
}
process.exit(result.status ?? 1);
