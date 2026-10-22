"use client";

import { onUsageChange, readUsage, readUsageSaved, replaceUsage, writeUsageSaved } from "./store";
import {
  changesForAccount,
  diffUsage,
  isEmptyChanges,
  mergeUsage,
  type RemoteUsage,
  type UsageChanges,
} from "./sync-model";
import { localDay } from "./usage";

/**
 * Keeps the check-up's usage in step with the signed-in account, when the
 * visitor has turned that on. On each page load the account's days are merged
 * in and anything the account is missing is sent; after that each change is
 * sent as it happens. A change that fails to send (offline) is picked up by
 * the next page load's merge; only "take back today" can be lost that way.
 */

async function call(method: string, body?: unknown): Promise<Response> {
  const res = await fetch("/api/usage", {
    method,
    headers: { "content-type": "application/json" },
    credentials: "same-origin",
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`${method} /api/usage failed: HTTP ${res.status}`);
  return res;
}

async function send(changes: UsageChanges) {
  if (!isEmptyChanges(changes)) await call("POST", changes);
}

/** Load the account's copy, merge it in, and send what the account is missing. */
async function pull() {
  const body = (await (await call("GET")).json()) as
    { enabled: false } | ({ enabled: true } & RemoteUsage);
  if (!body.enabled) {
    writeUsageSaved(false);
    return;
  }
  writeUsageSaved(true);
  const local = readUsage();
  if (!local.counting) {
    // Counting was turned off here while the account still had a copy.
    await setUsageSaved(false);
    return;
  }
  const merged = mergeUsage(local, body, localDay());
  replaceUsage(merged);
  await send(changesForAccount(merged, body));
}

/** Turn saving to the account on (sends everything counted so far) or off (deletes it there). */
export async function setUsageSaved(on: boolean) {
  const usage = readUsage();
  await call("PUT", { enabled: on, since: usage.since });
  writeUsageSaved(on);
  if (on) await send(changesForAccount(usage, { since: usage.since, days: {}, prices: {} }));
}

/** Started while signed in; returns a function that stops it. */
export function startUsageSync(): () => void {
  pull().catch((err: unknown) => console.warn("[usage] couldn't load from the account:", err));
  return onUsageChange((prev, next) => {
    if (!readUsageSaved()) return;
    // Turning counting off also deletes the account's copy.
    const work = next.counting ? send(diffUsage(prev, next)) : setUsageSaved(false);
    work.catch((err: unknown) => console.warn("[usage] couldn't save to the account:", err));
  });
}
