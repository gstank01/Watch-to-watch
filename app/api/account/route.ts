import { NextResponse } from "next/server";
import { guardAccountRequest } from "@/lib/account/guard";
import { deleteAccount } from "@/lib/account/repo";

/** Deletes the account and everything in it, immediately (spec §7, §9). */
export async function DELETE(req: Request) {
  const user = await guardAccountRequest(req, { write: true });
  if (user instanceof NextResponse) return user;
  await deleteAccount(user.id);
  return NextResponse.json({ ok: true });
}
