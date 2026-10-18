import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { minimalUser, withoutProviderTokens } from "@/lib/auth/privacy";
import { accountsStatus } from "@/lib/auth/status";

const KEYS = [
  "DATABASE_URL",
  "AUTH_SECRET",
  "AUTH_URL",
  "GOOGLE_CLIENT_ID",
  "GOOGLE_CLIENT_SECRET",
  "RESEND_API_KEY",
  "EMAIL_FROM",
  "EMAIL_TEST_OUTBOX",
] as const;

describe("which sign-in methods are on", () => {
  const saved: Record<string, string | undefined> = {};
  beforeEach(() => {
    for (const k of KEYS) {
      saved[k] = process.env[k];
      delete process.env[k];
    }
    process.env.DATABASE_URL = "postgresql://localhost/test";
    process.env.AUTH_SECRET = "x".repeat(32);
    process.env.AUTH_URL = "https://watch-to-watch.vercel.app";
  });
  afterEach(() => {
    for (const k of KEYS) {
      if (saved[k] === undefined) delete process.env[k];
      else process.env[k] = saved[k];
    }
  });

  it("is off without any way to sign in, and says what to set", () => {
    const status = accountsStatus();
    expect(status.enabled).toBe(false);
    expect(!status.enabled && status.missing.join()).toMatch(/GOOGLE_CLIENT_ID.*RESEND_API_KEY/);
  });

  it("turns on with Google alone: no domain or email service needed", () => {
    process.env.GOOGLE_CLIENT_ID = "id.apps.googleusercontent.com";
    process.env.GOOGLE_CLIENT_SECRET = "secret";
    expect(accountsStatus()).toEqual({ enabled: true, methods: { google: true, email: false } });
  });

  it("needs both Google values", () => {
    process.env.GOOGLE_CLIENT_ID = "id.apps.googleusercontent.com";
    expect(accountsStatus().enabled).toBe(false);
  });

  it("offers both when email is configured too", () => {
    process.env.GOOGLE_CLIENT_ID = "id";
    process.env.GOOGLE_CLIENT_SECRET = "secret";
    process.env.RESEND_API_KEY = "re_test";
    process.env.EMAIL_FROM = "signin@example.com";
    expect(accountsStatus()).toEqual({ enabled: true, methods: { google: true, email: true } });
  });

  it("still needs the database, secret and address", () => {
    process.env.GOOGLE_CLIENT_ID = "id";
    process.env.GOOGLE_CLIENT_SECRET = "secret";
    delete process.env.DATABASE_URL;
    process.env.AUTH_SECRET = "too-short";
    const status = accountsStatus();
    expect(!status.enabled && status.missing).toEqual([
      "DATABASE_URL",
      "AUTH_SECRET (32+ characters)",
    ]);
  });
});

describe("what we keep from a sign-in provider", () => {
  it("drops Google's name and photo", () => {
    expect(
      minimalUser({ email: "a@example.com", name: "Ada Lovelace", image: "https://lh3/x.jpg" }),
    ).toEqual({
      email: "a@example.com",
      name: "",
      image: null,
    });
  });

  it("drops Google's tokens but keeps the account link", () => {
    const account = {
      providerId: "google",
      accountId: "1234",
      userId: "u1",
      accessToken: "ya29.secret",
      refreshToken: "1//secret",
      idToken: "eyJ.secret",
      accessTokenExpiresAt: new Date(),
      scope: "openid email",
    };
    expect(withoutProviderTokens(account)).toEqual({
      providerId: "google",
      accountId: "1234",
      userId: "u1",
      accessToken: null,
      refreshToken: null,
      idToken: null,
      accessTokenExpiresAt: null,
      scope: "openid email",
    });
  });

  it("leaves fields that aren't there alone", () => {
    expect(withoutProviderTokens({ providerId: "magic-link" })).toEqual({
      providerId: "magic-link",
    });
  });
});
