import { readFileSync } from "node:fs";
import path from "node:path";
import { parse } from "yaml";
import type { z } from "zod";
import { freeServicesFileSchema, providerLinksFileSchema } from "./schemas";

/** Parses and validates a YAML data file. Throws a readable error on invalid data. */
export function parseDataFile<T extends z.ZodType>(source: string, schema: T, label: string) {
  let raw: unknown;
  try {
    raw = parse(source);
  } catch (err) {
    throw new Error(`${label}: invalid YAML: ${(err as Error).message}`);
  }
  const result = schema.safeParse(raw ?? []);
  if (!result.success) {
    const issues = result.error.issues
      .map((i) => `  - ${i.path.join(".") || "(root)"}: ${i.message}`)
      .join("\n");
    throw new Error(`${label}: invalid data\n${issues}`);
  }
  return result.data as z.infer<T>;
}

export function loadFreeServicesFile() {
  const source = readFileSync(path.join(process.cwd(), "data", "free-services.yaml"), "utf8");
  return parseDataFile(source, freeServicesFileSchema, "free-services.yaml");
}

export function loadProviderLinksFile() {
  const source = readFileSync(path.join(process.cwd(), "data", "provider-links.yaml"), "utf8");
  return parseDataFile(source, providerLinksFileSchema, "provider-links.yaml");
}
