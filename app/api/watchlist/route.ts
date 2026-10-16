import { NextResponse } from "next/server";
import { guardAccountRequest, readJson } from "@/lib/account/guard";
import { applyLibraryChanges, getLibrary, LimitError } from "@/lib/account/repo";
import { libraryChangesSchema } from "@/lib/account/schemas";

/** The signed-in user's My list. */
export async function GET(req: Request) {
  const user = await guardAccountRequest(req, { write: false });
  if (user instanceof NextResponse) return user;
  return NextResponse.json({ entries: await getLibrary(user.id) });
}

/** Apply changes from a device: `{ upsert: LibraryEntry[], remove: { id, mediaType }[] }`. */
export async function POST(req: Request) {
  const user = await guardAccountRequest(req, { write: true });
  if (user instanceof NextResponse) return user;
  const parsed = libraryChangesSchema.safeParse(await readJson(req));
  if (!parsed.success) return NextResponse.json({ error: "Invalid changes" }, { status: 400 });
  try {
    await applyLibraryChanges(user.id, parsed.data);
  } catch (err) {
    if (err instanceof LimitError) {
      return NextResponse.json({ error: err.message }, { status: 413 });
    }
    throw err;
  }
  return NextResponse.json({ ok: true });
}
