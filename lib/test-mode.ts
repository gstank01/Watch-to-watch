import "server-only";

/**
 * True only in the e2e test setup (sign-in emails go to a local outbox), never
 * on Vercel. All tests share one IP address, so per-visitor rate limits are
 * relaxed there.
 */
export const isTestMode = () => !!process.env.EMAIL_TEST_OUTBOX && !process.env.VERCEL;
