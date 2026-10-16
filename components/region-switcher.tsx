"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { REGION_COOKIE, SUPPORTED_REGIONS } from "@/lib/region-shared";

/** Country picker. Saves the choice in a cookie and re-renders the page for it. */
export function RegionSwitcher({ current }: { current: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  return (
    <label className="flex items-center gap-2 text-sm">
      <span className="sr-only">Country</span>
      <select
        className="border-border bg-surface rounded-md border px-2 py-1"
        value={current}
        disabled={pending}
        onChange={(e) => {
          const code = e.target.value;
          document.cookie = `${REGION_COOKIE}=${code}; path=/; max-age=${60 * 60 * 24 * 365}; samesite=lax`;
          startTransition(() => router.refresh());
        }}
      >
        {SUPPORTED_REGIONS.map((r) => (
          <option key={r.code} value={r.code}>
            {r.flag} {r.label}
          </option>
        ))}
      </select>
    </label>
  );
}
