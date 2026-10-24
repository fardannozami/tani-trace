import crypto from "node:crypto";
import { Redis } from "@upstash/redis";

const NONCE_TTL_MS = 5 * 60 * 1000;
const store = new Map<string, { address: string; expires: number }>();
const NONCE_PREFIX = "tanitrace:upload:nonce:";

function redis(): Redis | null {
  if (!process.env.UPSTASH_REDIS_REST_URL || !process.env.UPSTASH_REDIS_REST_TOKEN) return null;
  return Redis.fromEnv();
}

export function secret() {
  return process.env.UPLOAD_SIGNING_SECRET || "";
}

export async function issueNonce(address: string) {
  const nonce = crypto.randomBytes(16).toString("hex");
  const expiresAt = Date.now() + NONCE_TTL_MS;
  // PENTING: alamat harus lowercase di kedua sisi (issue & verify), karena
  // wallet mengirim alamat checksummed (EIP-55) sedangkan verifyAuth
  // menormalisasi ke lowercase. Tanpa ini token selalu INVALID_TOKEN.
  const normalized = String(address).toLowerCase();
  const token = crypto.createHmac("sha256", secret()).update(`${nonce}:${normalized}:${expiresAt}`).digest("hex");
  store.set(nonce, { address: normalized, expires: expiresAt });
  const client = redis();
  if (client) await client.set(`${NONCE_PREFIX}${nonce}`, { address: normalized, expires: expiresAt }, { px: NONCE_TTL_MS });
  return { nonce, token, expiresAt };
}

export async function consumeNonce(nonce: string) {
  store.delete(nonce);
  const client = redis();
  if (client) await client.del(`${NONCE_PREFIX}${nonce}`);
}

export async function getNonce(nonce: string) {
  const client = redis();
  if (client) return client.get<{ address: string; expires: number }>(`${NONCE_PREFIX}${nonce}`);
  return store.get(nonce) ?? null;
}

export function hasSharedStore() {
  return redis() !== null;
}

export { store };
