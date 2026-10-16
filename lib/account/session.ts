"use client";

import { authClient } from "@/lib/auth/client";
import { clearLocalAccountData, flush, hasUnsavedChanges } from "./sync";

/**
 * Signs out and removes the account's list from this browser, so the next
 * person to use it doesn't see it. Returns false if the visitor cancelled.
 */
export async function signOutAndForget(): Promise<boolean> {
  await flush().catch(() => {});
  if (
    hasUnsavedChanges() &&
    !window.confirm("Some changes haven't reached your account yet. Sign out anyway?")
  ) {
    return false;
  }
  await authClient.signOut().catch(() => {});
  clearLocalAccountData();
  return true;
}

/** Deletes the account on the server, then forgets it in this browser. */
export async function deleteAccountAndForget() {
  const res = await fetch("/api/account", {
    method: "DELETE",
    headers: { "content-type": "application/json" },
    body: "{}",
  });
  if (!res.ok) throw new Error(`Couldn't delete the account (HTTP ${res.status})`);
  clearLocalAccountData();
  await authClient.signOut().catch(() => {}); // the session is already gone
}
