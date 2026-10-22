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

const day = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const dayRef = z.object({ providerId: z.number().int().positive(), day });

/** `PUT /api/usage`: turn saving usage to the account on or off. */
export const usageSettingsSchema = z.object({
  enabled: z.boolean(),
  since: day.nullable().optional(),
});

/** `POST /api/usage`: days added and removed, and (when they changed) all prices. */
export const usageChangesSchema = z.object({
  add: z.array(dayRef).max(LIMITS.perRequest),
  remove: z.array(dayRef).max(LIMITS.perRequest),
  prices: z
    .record(z.string().regex(/^[A-Z]{2}:\d+$/), z.number().positive().lt(1000).multipleOf(0.01))
    .refine((p) => Object.keys(p).length <= LIMITS.services, "Too many prices")
    .optional(),
  since: day.nullable().optional(),
});
