"use client";

import Image from "next/image";
import { useState } from "react";
import { posterUrl, type PosterSize } from "@/lib/tmdb/images";

type Props = {
  path: string | null;
  title: string;
  size?: PosterSize;
  /** Rendered width hint for the browser, e.g. "(min-width: 640px) 180px, 45vw". */
  sizes?: string;
  /** Preload the image: only for the page's main (LCP) poster. */
  preload?: boolean;
  className?: string;
};

export function Poster({ path, title, size = "w342", sizes = "180px", preload, className }: Props) {
  const src = posterUrl(path, size);
  // Show the title instead of a broken-image icon if the poster can't load.
  const [failed, setFailed] = useState(false);
  return (
    <div
      className={`bg-surface-2 relative aspect-[2/3] overflow-hidden rounded-lg ${className ?? ""}`}
    >
      {src && !failed ? (
        <Image
          src={src}
          alt={`Poster for ${title}`}
          fill
          sizes={sizes}
          preload={preload}
          onError={() => setFailed(true)}
          className="object-cover"
        />
      ) : (
        <div
          className="text-muted flex h-full items-center justify-center p-2 text-center text-sm"
          data-testid="poster-fallback"
        >
          {title}
        </div>
      )}
    </div>
  );
}
