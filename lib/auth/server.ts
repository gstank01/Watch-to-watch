import "server-only";
import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { nextCookies } from "better-auth/next-js";
import { magicLink } from "better-auth/plugins/magic-link";
import { headers } from "next/headers";
import { db } from "@/lib/db";
import { getEmailSender } from "@/lib/email";
import { signInEmail } from "@/lib/email/templates";
import { accountsStatus } from "./status";

export const MAGIC_LINK_MINUTES = 15;

function createAuth() {
  const sender = getEmailSender()!;
  const testing = sender.kind === "outbox";
  return betterAuth({
    appName: "WhatToWatch",
    secret: process.env.AUTH_SECRET,
    baseURL: process.env.AUTH_URL,
    database: prismaAdapter(db(), { provider: "postgresql" }),
    session: {
      expiresIn: 60 * 60 * 24 * 30, // 30 days
      updateAge: 60 * 60 * 24, // refresh the expiry at most daily
      // Avoid a database lookup on every page view.
      cookieCache: { enabled: true, maxAge: 5 * 60 },
    },
    // Rate limiting is on in every environment; the e2e outbox gets a looser limit.
    rateLimit: { enabled: true, window: 60, max: testing ? 1000 : 100 },
    databaseHooks: {
      session: {
        create: {
          // Privacy: we collect email, region, services and lists only (spec §9).
          before: async (session) => ({ data: { ...session, ipAddress: null, userAgent: null } }),
        },
      },
    },
    plugins: [
      magicLink({
        expiresIn: MAGIC_LINK_MINUTES * 60,
        storeToken: "hashed",
        rateLimit: { window: 60, max: testing ? 1000 : 5 },
        sendMagicLink: async ({ email, url }) => {
          await sender.send(signInEmail({ to: email, url, expiresInMinutes: MAGIC_LINK_MINUTES }));
        },
      }),
      nextCookies(),
    ],
  });
}

let instance: ReturnType<typeof createAuth> | undefined;

/** Better Auth, or null when accounts aren't configured on this server. */
export function getAuth() {
  if (!accountsStatus().enabled) return null;
  instance ??= createAuth();
  return instance;
}

export type SessionUser = { id: string; email: string };

/** The signed-in user for this request, or null (also when accounts are off). */
export async function getSessionUser(): Promise<SessionUser | null> {
  const auth = getAuth();
  if (!auth) return null;
  const session = await auth.api.getSession({ headers: await headers() });
  return session ? { id: session.user.id, email: session.user.email } : null;
}
