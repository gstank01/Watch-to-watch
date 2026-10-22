"use client";

import { useEffect } from "react";
import { startSync } from "@/lib/account/sync";
import { startUsageSync } from "@/lib/checkup/sync";

/**
 * Mounted while signed in: keeps My list and services in step with the account,
 * and the check-up's usage too when the visitor has turned that on.
 */
export function AccountSync({ userId }: { userId: string }) {
  useEffect(() => startSync(userId), [userId]);
  useEffect(() => startUsageSync(), [userId]);
  return null;
}
