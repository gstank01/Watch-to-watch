import { NextResponse } from "next/server";
import { getAuth } from "@/lib/auth/server";

async function handle(req: Request) {
  const auth = getAuth();
  if (!auth) return NextResponse.json({ error: "Accounts aren't set up" }, { status: 404 });
  return auth.handler(req);
}

export { handle as GET, handle as POST };
