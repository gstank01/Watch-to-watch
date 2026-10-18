import "server-only";
import { getEmailSender } from "@/lib/email";

/** Which ways of signing in this server offers. */
export type SignInMethods = { google: boolean; email: boolean };

export type AccountsStatus =
  { enabled: true; methods: SignInMethods } | { enabled: false; missing: string[] };

export function signInMethods(): SignInMethods {
  return {
    google: !!(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET),
    email: !!getEmailSender(),
  };
}

/**
 * Accounts are optional: without a database, secret, URL and at least one way
 * to sign in (Google, or email links), the app keeps working with everything
 * saved in the browser.
 */
export function accountsStatus(): AccountsStatus {
  const missing: string[] = [];
  if (!process.env.DATABASE_URL) missing.push("DATABASE_URL");
  if (!process.env.AUTH_SECRET || process.env.AUTH_SECRET.length < 32) {
    missing.push("AUTH_SECRET (32+ characters)");
  }
  if (!process.env.AUTH_URL) missing.push("AUTH_URL");
  const methods = signInMethods();
  if (!methods.google && !methods.email) {
    missing.push(
      "a sign-in method (GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET, or RESEND_API_KEY and EMAIL_FROM)",
    );
  }
  return missing.length ? { enabled: false, missing } : { enabled: true, methods };
}
