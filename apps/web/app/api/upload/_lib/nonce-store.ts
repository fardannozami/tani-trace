import crypto from "node:crypto";

const NONCE_TTL_MS = 5 * 60 * 1000;
const store = new Map<string, { address: string; expires: number }>();

export function secret() {
  return process.env.UPLOAD_SIGNING_SECRET || "";
}

export function issueNonce(address: string) {
  const nonce = crypto.randomBytes(16).toString("hex");
  const expiresAt = Date.now() + NONCE_TTL_MS;
  const token = crypto.createHmac("sha256", secret()).update(`${nonce}:${address}:${expiresAt}`).digest("hex");
  store.set(nonce, { address: String(address).toLowerCase(), expires: expiresAt });
  return { nonce, token, expiresAt };
}

export function verifyNonce(nonce: string, address: string): boolean {
  const rec = store.get(nonce);
  if (!rec) return false;
  if (rec.expires < Date.now()) { store.delete(nonce); return false; }
  if (rec.address !== String(address).toLowerCase()) return false;
  return true;
}

export function consumeNonce(nonce: string) {
  store.delete(nonce);
}

export { store };
