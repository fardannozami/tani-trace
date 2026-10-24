import crypto from "node:crypto";
import { verifyMessage } from "viem";
import { consumeNonce, store } from "./nonce-store";

const SECRET_MAX_TTL_MS = 5 * 60 * 1000;

/** Dibaca saat runtime (bukan saat impor) agar mudah diuji dan mengikuti env aktif. */
function secret(): string {
  return process.env.UPLOAD_SIGNING_SECRET || "";
}

export type AuthBody = {
  address: string;
  nonce: string;
  token: string;
  signature: string;
  size?: number;
  name?: string;
  /** Dikirim klien agar verifikasi tidak bergantung pada store in-memory. */
  expiresAt?: number;
};

export async function verifyAuth(body: AuthBody, expectedMessage: string): Promise<{ ok: boolean; error?: string; status?: number }> {
  const { address, nonce, token, signature } = body || ({} as AuthBody);
  if (!address || !nonce || !token || !signature) return { ok: false, error: "UNAUTHORIZED", status: 401 };

  const normalizedAddress = String(address).toLowerCase();
  const rec = store.get(nonce);
  // A nonce is a one-time capability. HMAC alone is not enough because the
  // same signed request could otherwise be replayed until expiresAt.
  if (!rec) return { ok: false, error: "INVALID_NONCE", status: 401 };
  if (rec.address !== normalizedAddress) return { ok: false, error: "UNAUTHORIZED", status: 401 };
  if (rec.expires < Date.now()) {
    store.delete(nonce);
    return { ok: false, error: "INVALID_NONCE", status: 401 };
  }

  const expiresAt = Number(body.expiresAt) || rec?.expires;
  if (!expiresAt || !Number.isFinite(expiresAt)) return { ok: false, error: "INVALID_NONCE", status: 401 };
  if (expiresAt < Date.now()) return { ok: false, error: "INVALID_NONCE", status: 401 };
  if (expiresAt > Date.now() + SECRET_MAX_TTL_MS) return { ok: false, error: "INVALID_NONCE", status: 401 };

  const expected = crypto.createHmac("sha256", secret()).update(`${nonce}:${normalizedAddress}:${expiresAt}`).digest("hex");
  if (token !== expected) return { ok: false, error: "INVALID_TOKEN", status: 401 };
  const ok = await verifyMessage({ address: address as `0x${string}`, message: expectedMessage, signature: signature as `0x${string}` });
  if (!ok) return { ok: false, error: "INVALID_SIGNATURE", status: 401 };
  consumeNonce(nonce);
  return { ok: true };
}
