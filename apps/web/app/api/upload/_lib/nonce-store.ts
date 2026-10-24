import crypto from "node:crypto";

const NONCE_TTL_MS = 5 * 60 * 1000;
const store = new Map<string, { address: string; expires: number }>();

export function secret() {
  return process.env.UPLOAD_SIGNING_SECRET || "";
}

export function issueNonce(address: string) {
  const nonce = crypto.randomBytes(16).toString("hex");
  const expiresAt = Date.now() + NONCE_TTL_MS;
  // PENTING: alamat harus lowercase di kedua sisi (issue & verify), karena
  // wallet mengirim alamat checksummed (EIP-55) sedangkan verifyAuth
  // menormalisasi ke lowercase. Tanpa ini token selalu INVALID_TOKEN.
  const normalized = String(address).toLowerCase();
  const token = crypto.createHmac("sha256", secret()).update(`${nonce}:${normalized}:${expiresAt}`).digest("hex");
  store.set(nonce, { address: normalized, expires: expiresAt });
  return { nonce, token, expiresAt };
}

export function consumeNonce(nonce: string) {
  store.delete(nonce);
}

export { store };
