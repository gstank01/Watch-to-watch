import { NextResponse } from "next/server";
import { guardAccountRequest, readJson } from "@/lib/account/guard";
import {
  applyUsageChanges,
  disableUsageSync,
  enableUsageSync,
  getUsage,
  UsageSyncOffError,
} from "@/lib/account/repo";
import { usageChangesSchema, usageSettingsSchema } from "@/lib/account/schemas";

/** The signed-in user's saved check-up usage, or `{ enabled: false }`. */
export async function GET(req: Request) {
  const user = await guardAccountRequest(req, { write: false });
  if (user instanceof NextResponse) return user;
  return NextResponse.json(await getUsage(user.id));
}

/** Turn saving on or off: `{ enabled, since? }`. Off deletes everything saved. */
export async function PUT(req: Request) {
  const user = await guardAccountRequest(req, { write: true });
  if (user instanceof NextResponse) return user;
  const parsed = usageSettingsSchema.safeParse(await readJson(req));
  if (!parsed.success) return NextResponse.json({ error: "Invalid setting" }, { status: 400 });
  if (parsed.data.enabled) await enableUsageSync(user.id, parsed.data.since ?? null);
  else await disableUsageSync(user.id);
  return NextResponse.json({ ok: true });
}

/** Days added and removed, and prices when they changed. */
export async function POST(req: Request) {
  const user = await guardAccountRequest(req, { write: true });
  if (user instanceof NextResponse) return user;
  const parsed = usageChangesSchema.safeParse(await readJson(req));
  if (!parsed.success) return NextResponse.json({ error: "Invalid changes" }, { status: 400 });
  try {
    await applyUsageChanges(user.id, parsed.data);
  } catch (err) {
    if (err instanceof UsageSyncOffError) {
      return NextResponse.json({ error: err.message }, { status: 409 });
    }
    throw err;
  }
  return NextResponse.json({ ok: true });
}
