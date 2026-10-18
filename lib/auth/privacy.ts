/**
 * We keep only the email address (spec §9). These strip what sign-in
 * providers hand us before it reaches the database.
 */

/** Google's name and photo aren't kept. */
export function minimalUser<T extends { name?: string | null; image?: string | null }>(user: T): T {
  return { ...user, name: "", image: null };
}

/** We never call Google on the user's behalf, so its tokens aren't kept. */
export function withoutProviderTokens<T extends Record<string, unknown>>(account: T): T {
  const stripped: Record<string, unknown> = { ...account };
  for (const key of [
    "accessToken",
    "refreshToken",
    "idToken",
    "accessTokenExpiresAt",
    "refreshTokenExpiresAt",
  ]) {
    if (key in stripped) stripped[key] = null;
  }
  return stripped as T;
}
