import type { MediaType } from "./schemas";

/** A film or show, normalised from TMDB's movie/TV shapes. Safe to send to the client. */
export type TitleSummary = {
  id: number;
  mediaType: MediaType;
  title: string;
  year: string | null;
  posterPath: string | null;
  overview: string;
  rating: number | null;
};

export type ProviderInfo = {
  id: number;
  name: string;
  logoPath: string | null;
  priority: number;
};
