import "server-only";
import { getEmailSender } from "@/lib/email";

export type AccountsStatus = { enabled: true } | { enabled: false; missing: string[] };

/**
 * Accounts are optional: without a database, secret, URL and email, the app
 * keeps working with everything saved in the browser.
 */
export function accountsStatus(): AccountsStatus {
  const missing: string[] = [];
  if (!process.env.DATABASE_URL) missing.push("DATABASE_URL");
  if (!process.env.AUTH_SECRET || process.env.AUTH_SECRET.length < 32) {
    missing.push("AUTH_SECRET (32+ characters)");
  }
  if (!process.env.AUTH_URL) missing.push("AUTH_URL");
  if (!getEmailSender()) missing.push("RESEND_API_KEY and EMAIL_FROM");
  return missing.length ? { enabled: false, missing } : { enabled: true };
}
