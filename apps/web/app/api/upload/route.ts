import { NextRequest, NextResponse } from "next/server";
import { verifyAuth } from "./_lib/auth";
import { EVIDENCE_MIME_TYPES } from "../../../lib/file-types";

const ALLOWED = new Set(EVIDENCE_MIME_TYPES as readonly string[]);
const MAX_FILE = 4 * 1024 * 1024;

export async function POST(req: NextRequest) {
  const form = await req.formData();
  const file = form.get("file") as File | null;
  const address = String(form.get("address") || "");
  const nonce = String(form.get("nonce") || "");
  const token = String(form.get("token") || "");
  const signature = String(form.get("signature") || "");
  const size = Number(form.get("size") || 0);
  const name = String(form.get("name") || file?.name || "");

  if (!file) return NextResponse.json({ error: "BAD_FILE" }, { status: 400 });

  const auth = await verifyAuth({ address, nonce, token, signature, size, name }, `TaniTrace upload\nnonce:${nonce}\ntoken:${token}\nsize:${size}\nname:${name}`);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status || 401 });

  const mime = file.type || "";
  if (!ALLOWED.has(mime)) return NextResponse.json({ error: "UNSUPPORTED_MEDIA_TYPE" }, { status: 415 });
  if (file.size > MAX_FILE) return NextResponse.json({ error: "PAYLOAD_TOO_LARGE" }, { status: 413 });

  const jwt = process.env.PINATA_JWT;
  if (!jwt) return NextResponse.json({ error: "UPLOAD_NOT_CONFIGURED" }, { status: 503 });

  const pinataForm = new FormData();
  pinataForm.append("file", file, file.name);
  const res = await fetch("https://api.pinata.cloud/pinning/pinFileToIPFS", {
    method: "POST",
    headers: { Authorization: `Bearer ${jwt}` },
    body: pinataForm,
  });
  const data = await res.json();
  if (!res.ok) return NextResponse.json({ error: "IPFS_FAILED" }, { status: 502 });
  return NextResponse.json({ cid: data.IpfsHash });
}