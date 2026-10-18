import { z } from "zod";
import { MAX_RATING, MIN_RATING, STATUSES } from "@/lib/library/model";

/** Upper bounds that keep one request (and one account) a sensible size. */
export const LIMITS = { perRequest: 500, perAccount: 5000, services: 100 } as const;

const titleRef = z.object({
  id: z.number().int().positive(),
  mediaType: z.enum(["movie", "tv"]),
});

export const libraryEntrySchema = titleRef.extend({
  title: z.string().min(1).max(300),
  year: z.string().max(10).nullable(),
  posterPath: z
    .string()
    .regex(/^\/[\w.-]+$/)
    .max(200)
    .nullable(),
  favourite: z.boolean(),
  status: z.enum(STATUSES).nullable(),
  // Older browsers' copies may not send it yet.
  rating: z.number().int().min(MIN_RATING).max(MAX_RATING).nullable().default(null),
  updatedAt: z.iso.datetime(),
});

export const libraryChangesSchema = z.object({
  upsert: z.array(libraryEntrySchema).max(LIMITS.perRequest),
  remove: z.array(titleRef).max(LIMITS.perRequest),
});

export const servicesSchema = z.object({
  providerIds: z.array(z.number().int().positive()).max(LIMITS.services),
});
