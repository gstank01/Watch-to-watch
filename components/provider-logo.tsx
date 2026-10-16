"use client";

import Image from "next/image";
import { useState } from "react";
import { logoUrl } from "@/lib/tmdb/images";

export function ProviderLogo({
  path,
  name,
  size = 40,
}: {
  path: string | null;
  name: string;
  size?: number;
}) {
  // w92 source so the optimizer has enough pixels for high-density screens.
  const src = logoUrl(path, "w92");
  const [failed, setFailed] = useState(false);
  if (!src || failed) {
    return (
      <span
        aria-hidden
        style={{ width: size, height: size }}
        className="bg-surface-2 flex shrink-0 items-center justify-center rounded-md text-xs font-bold"
      >
        {name.slice(0, 2)}
      </span>
    );
  }
  // Decorative: the provider name is always shown next to the logo.
  return (
    <Image
      src={src}
      alt=""
      width={size}
      height={size}
      onError={() => setFailed(true)}
      className="shrink-0 rounded-md"
      style={{ width: size, height: size }}
    />
  );
}
