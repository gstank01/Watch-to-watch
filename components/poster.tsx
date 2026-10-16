import Image from "next/image";
import { posterUrl, type PosterSize } from "@/lib/tmdb/images";

type Props = {
  path: string | null;
  title: string;
  size?: PosterSize;
  /** Rendered width hint for the browser, e.g. "(min-width: 640px) 180px, 45vw". */
  sizes?: string;
  priority?: boolean;
  className?: string;
};

export function Poster({
  path,
  title,
  size = "w342",
  sizes = "180px",
  priority,
  className,
}: Props) {
  const src = posterUrl(path, size);
  return (
    <div
      className={`bg-surface-2 relative aspect-[2/3] overflow-hidden rounded-lg ${className ?? ""}`}
    >
      {src ? (
        <Image
          src={src}
          alt={`Poster for ${title}`}
          fill
          sizes={sizes}
          priority={priority}
          className="object-cover"
        />
      ) : (
        <div className="text-muted flex h-full items-center justify-center p-2 text-center text-sm">
          {title}
        </div>
      )}
    </div>
  );
}
