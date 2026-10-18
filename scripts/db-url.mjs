/**
 * Works out which connection string to run migrations with, and explains
 * common mistakes in DATABASE_URL. Plain JS so the build can run it before
 * anything is compiled.
 */

/** @returns {{ url: string } | { problem: string }} */
export function migrationUrl(env) {
  const raw = (env.DATABASE_URL_UNPOOLED || env.DATABASE_URL || "").trim();
  if (/^psql\s/.test(raw) || /^['"]/.test(raw)) {
    return {
      problem:
        "DATABASE_URL looks like it was copied with extra text around it (e.g. psql '…' or quotes). " +
        "Paste only the part starting with postgresql://",
    };
  }
  let url;
  try {
    url = new URL(raw);
  } catch {
    return { problem: "DATABASE_URL isn't a valid address. It should start with postgresql://" };
  }
  if (url.protocol !== "postgresql:" && url.protocol !== "postgres:") {
    return {
      problem: `DATABASE_URL should start with postgresql:// (it starts with ${url.protocol}//)`,
    };
  }
  // Neon's pooled address (…-pooler.…) can't hold the lock migrations need;
  // the same address without "-pooler" is the direct connection.
  if (!env.DATABASE_URL_UNPOOLED && url.hostname.includes("-pooler.")) {
    url.hostname = url.hostname.replace("-pooler.", ".");
  }
  return { url: url.toString() };
}
