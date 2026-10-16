const IMAGE_BASE = "https://image.tmdb.org/t/p";

export type PosterSize = "w92" | "w154" | "w185" | "w342" | "w500" | "w780";
export type LogoSize = "w45" | "w92" | "w154";

export function posterUrl(path: string | null | undefined, size: PosterSize = "w342") {
  return path ? `${IMAGE_BASE}/${size}${path}` : null;
}

export function logoUrl(path: string | null | undefined, size: LogoSize = "w92") {
  return path ? `${IMAGE_BASE}/${size}${path}` : null;
}
