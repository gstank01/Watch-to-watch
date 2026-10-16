"use client";

import { useEffect } from "react";
import { startSync } from "@/lib/account/sync";

/** Mounted while signed in: keeps My list and services in step with the account. */
export function AccountSync({ userId }: { userId: string }) {
  useEffect(() => startSync(userId), [userId]);
  return null;
}
