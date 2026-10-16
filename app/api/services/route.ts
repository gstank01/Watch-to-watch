import { NextResponse } from "next/server";
import { guardAccountRequest, readJson } from "@/lib/account/guard";
import { getServices, setServices } from "@/lib/account/repo";
import { servicesSchema } from "@/lib/account/schemas";

/** The signed-in user's streaming services. */
export async function GET(req: Request) {
  const user = await guardAccountRequest(req, { write: false });
  if (user instanceof NextResponse) return user;
  return NextResponse.json({ providerIds: await getServices(user.id) });
}

/** Replace the user's services: `{ providerIds: number[] }`. */
export async function PUT(req: Request) {
  const user = await guardAccountRequest(req, { write: true });
  if (user instanceof NextResponse) return user;
  const parsed = servicesSchema.safeParse(await readJson(req));
  if (!parsed.success) return NextResponse.json({ error: "Invalid services" }, { status: 400 });
  await setServices(user.id, parsed.data.providerIds);
  return NextResponse.json({ ok: true });
}
