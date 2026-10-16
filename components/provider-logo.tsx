import Image from "next/image";
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
  const src = logoUrl(path, size > 45 ? "w92" : "w45");
  if (!src) {
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
      className="shrink-0 rounded-md"
      style={{ width: size, height: size }}
    />
  );
}
