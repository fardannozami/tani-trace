import { NextRequest, NextResponse } from "next/server";
import { hasSharedStore, issueNonce } from "../_lib/nonce-store";

export async function POST(req: NextRequest) {
  const { address } = await req.json().catch(() => ({}));
  if (!address) return NextResponse.json({ error: "BAD_ADDRESS" }, { status: 400 });
  if (!process.env.UPLOAD_SIGNING_SECRET) {
    return NextResponse.json({ error: "UPLOAD_NOT_CONFIGURED" }, { status: 503 });
  }
  if (process.env.VERCEL && !hasSharedStore()) {
    return NextResponse.json({ error: "UPLOAD_STORE_NOT_CONFIGURED" }, { status: 503 });
  }
  return NextResponse.json(await issueNonce(String(address)));
}
