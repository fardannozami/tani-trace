import { NextRequest, NextResponse } from "next/server";
import { verifyAuth } from "../../upload/_lib/auth";
import { normalizeAdvisoryReport } from "../../../../lib/advisory";
import { isInspectableEvidenceMime } from "../../../../lib/file-types";

const MAX_FILE = 4 * 1024 * 1024;
const MAX_BUNDLE = 8 * 1024 * 1024;
const throttle = new Map<string, number[]>();

function checkThrottle(addr: string): boolean {
  const now = Date.now();
  const windowMs = 10 * 60 * 1000;
  const arr = (throttle.get(addr) || []).filter((t) => now - t < windowMs);
  if (arr.length >= 6) return false;
  arr.push(now);
  throttle.set(addr, arr);
  return true;
}

export async function POST(req: NextRequest) {
  const form = await req.formData();
  const files = form.getAll("files") as File[];
  const address = String(form.get("address") || "");
  const nonce = String(form.get("nonce") || "");
  const token = String(form.get("token") || "");
  const signature = String(form.get("signature") || "");
  const purpose = String(form.get("purpose") || "");
  const notes = String(form.get("notes") || "").slice(0, 400);
  const expiresAt = Number(form.get("expiresAt") || 0);

  // size for auth message
  const totalSize = files.reduce((a, f) => a + (f?.size || 0), 0);
  const auth = await verifyAuth({ address, nonce, token, signature, expiresAt }, `TaniTrace advisory\nnonce:${nonce}\ntoken:${token}\nsize:${totalSize}`);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status || 401 });

  if (files.length < 1 || files.length > 4) return NextResponse.json({ error: "BAD_FILE_COUNT" }, { status: 400 });
  for (const f of files) {
    if (!isInspectableEvidenceMime(f.type)) return NextResponse.json({ error: "BAD_MIME" }, { status: 415 });
    if (f.size > MAX_FILE) return NextResponse.json({ error: "FILE_TOO_LARGE" }, { status: 413 });
  }
  if (totalSize > MAX_BUNDLE) return NextResponse.json({ error: "BUNDLE_TOO_LARGE" }, { status: 413 });
  if (purpose.length < 1 || purpose.length > 96) return NextResponse.json({ error: "BAD_PURPOSE" }, { status: 400 });

  if (!checkThrottle(address.toLowerCase())) return NextResponse.json({ error: "RATE_LIMITED" }, { status: 429 });

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return NextResponse.json({ error: "AI_NOT_CONFIGURED" }, { status: 200 });

  const model = process.env.GEMINI_MODEL || "gemini-2.5-flash";

  try {
    const parts: Array<{ text?: string; inlineData?: { mimeType: string; data: string } }> = [{ text: `Periksa berkas bukti disbursement. Purpose: ${purpose}. Notes: ${notes}. Kembalikan JSON {summary, findings:[{label,detail,severity}]}.` }];
    for (const f of files) {
      const buf = Buffer.from(await f.arrayBuffer());
      parts.push({ inlineData: { mimeType: f.type, data: buf.toString("base64") } });
    }
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ contents: [{ parts }] }),
    });
    if (!res.ok) return NextResponse.json({ error: "AI_FAILED" }, { status: 200 });
    const data = await res.json();
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text || "";
    let parsed: unknown = null;
    try {
      const m = text.match(/\{[\s\S]*\}/);
      parsed = m ? JSON.parse(m[0]) : null;
    } catch {
      parsed = null;
    }
    const report = normalizeAdvisoryReport(parsed);
    return NextResponse.json({ report });
  } catch {
    return NextResponse.json({ error: "AI_FAILED" }, { status: 200 });
  }
}