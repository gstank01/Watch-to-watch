import { config } from "dotenv";
import { defineConfig } from "prisma/config";

// Same files Next.js reads, so `npm run db:deploy` finds DATABASE_URL in .env.local.
config({ path: [".env.local", ".env"], quiet: true });

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: { path: "prisma/migrations" },
  // Only needed for migrate/introspect; `prisma generate` works without a database.
  datasource: process.env.DATABASE_URL ? { url: process.env.DATABASE_URL } : undefined,
});
