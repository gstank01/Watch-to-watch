import "server-only";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/lib/generated/prisma/client";

// Reuse one client across hot reloads in development.
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

/** The Prisma client. Throws if DATABASE_URL isn't set; check accountsStatus() first. */
export function db(): PrismaClient {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) throw new Error("DATABASE_URL is not set");
  globalForPrisma.prisma ??= new PrismaClient({ adapter: new PrismaPg(connectionString) });
  return globalForPrisma.prisma;
}
