import { NextRequest, NextResponse } from "next/server";
import { verifyAuth } from "../_lib/auth";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const { address, nonce, token, signature, manifest, expiresAt } = body;
  const serialized = JSON.stringify(manifest ?? {});
  const size = serialized.length;
  const auth = await verifyAuth({ address, nonce, token, signature, expiresAt: Number(expiresAt) || 0 }, `TaniTrace manifest\nnonce:${nonce}\ntoken:${token}\nsize:${size}`);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status || 401 });

  const jwt = process.env.PINATA_JWT;
  if (!jwt) return NextResponse.json({ error: "UPLOAD_NOT_CONFIGURED" }, { status: 503 });

  const res = await fetch("https://api.pinata.cloud/pinning/pinJSONToIPFS", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${jwt}` },
    body: JSON.stringify({ pinataContent: manifest }),
  });
  const data = await res.json();
  if (!res.ok) return NextResponse.json({ error: "IPFS_FAILED" }, { status: 502 });
  return NextResponse.json({ cid: data.IpfsHash });
}