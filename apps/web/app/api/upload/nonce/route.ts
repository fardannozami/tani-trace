import { NextRequest, NextResponse } from "next/server";
import { issueNonce } from "../_lib/nonce-store";

export async function POST(req: NextRequest) {
  const { address } = await req.json().catch(() => ({}));
  if (!address) return NextResponse.json({ error: "BAD_ADDRESS" }, { status: 400 });
  return NextResponse.json(issueNonce(String(address)));
}
