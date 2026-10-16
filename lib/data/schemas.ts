import { z } from "zod";
import { SUPPORTED_REGION_CODES } from "@/lib/region-shared";

/** A region listed in SUPPORTED_REGIONS (lib/region-shared.ts). */
export const regionCodeSchema = z.string().refine((code) => SUPPORTED_REGION_CODES.includes(code), {
  message: `Region must be one of ${SUPPORTED_REGION_CODES.join(", ")}`,
});

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
