import { z } from "zod";

/** ISO 3166-1 alpha-2, as TMDB uses for watch regions. */
export const regionCodeSchema = z.string().regex(/^[A-Z]{2}$/, "Region must be like GB or US");

export const freeServiceSchema = z.object({
  provider_id: z.number().int().positive(),
  provider_name: z.string().min(1),
  region: regionCodeSchema,
  notes: z.string().default(""),
});
export type FreeService = z.infer<typeof freeServiceSchema>;

export const freeServicesFileSchema = z.array(freeServiceSchema).superRefine((entries, ctx) => {
  const seen = new Set<string>();
  entries.forEach((e, i) => {
    const key = `${e.region}:${e.provider_id}`;
    if (seen.has(key)) {
      ctx.addIssue({
        code: "custom",
        path: [i],
        message: `Duplicate entry for provider ${e.provider_id} in ${e.region}`,
      });
    }
    seen.add(key);
  });
});
