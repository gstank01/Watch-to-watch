"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { REGION_COOKIE } from "@/lib/region-shared";
import type { Region } from "@/lib/tmdb/schemas";

export function RegionSwitcher({ current, regions }: { current: string; regions: Region[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const options = regions.some((r) => r.code === current)
    ? regions
    : [{ code: current, name: current }, ...regions];

  return (
    <label className="flex items-center gap-2 text-sm">
      <span className="text-muted">Region</span>
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
        {options.map((r) => (
          <option key={r.code} value={r.code}>
            {r.name}
          </option>
        ))}
      </select>
    </label>
  );
}
