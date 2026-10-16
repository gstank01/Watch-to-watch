// Applies database migrations when DATABASE_URL is set; does nothing otherwise
// (the app then runs without accounts). Used by the Vercel build.
import { spawnSync } from "node:child_process";

if (!process.env.DATABASE_URL) {
  console.log("No DATABASE_URL: skipping database migrations (accounts are off).");
  process.exit(0);
}
const result = spawnSync("npx", ["prisma", "migrate", "deploy"], { stdio: "inherit" });
process.exit(result.status ?? 1);
