import crypto from "node:crypto";
import { verifyMessage } from "viem";
import { verifyNonce, consumeNonce, store } from "./nonce-store";

const SECRET = process.env.UPLOAD_SIGNING_SECRET || "";

export type AuthBody = {
  address: string;
  nonce: string;
  token: string;
  signature: string;
  size?: number;
  name?: string;
};

export async function verifyAuth(body: AuthBody, expectedMessage: string): Promise<{ ok: boolean; error?: string; status?: number }> {
  const { address, nonce, token, signature } = body || ({} as AuthBody);
  if (!address || !nonce || !token || !signature) return { ok: false, error: "UNAUTHORIZED", status: 401 };
  if (!verifyNonce(nonce, address)) return { ok: false, error: "INVALID_NONCE", status: 401 };
  const rec = store.get(nonce);
  const expiresAt = rec?.expires;
  if (!expiresAt) return { ok: false, error: "INVALID_NONCE", status: 401 };
  const expected = crypto.createHmac("sha256", SECRET).update(`${nonce}:${String(address).toLowerCase()}:${expiresAt}`).digest("hex");
  if (token !== expected) return { ok: false, error: "INVALID_TOKEN", status: 401 };
  const ok = await verifyMessage({ address: address as `0x${string}`, message: expectedMessage, signature: signature as `0x${string}` });
  if (!ok) return { ok: false, error: "INVALID_SIGNATURE", status: 401 };
  consumeNonce(nonce);
  return { ok: true };
}