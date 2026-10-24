import { describe, it, expect, beforeAll } from "vitest";
import { privateKeyToAccount } from "viem/accounts";
import { issueNonce } from "../app/api/upload/_lib/nonce-store";
import { verifyAuth } from "../app/api/upload/_lib/auth";

const account = privateKeyToAccount("0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d");

function message(nonce: string, token: string, size: number, name: string) {
  return `TaniTrace upload\nnonce:${nonce}\ntoken:${token}\nsize:${size}\nname:${name}`;
}

describe("auth unggah", () => {
  beforeAll(() => {
    process.env.UPLOAD_SIGNING_SECRET = "secret-uji";
  });

  it("token issuance dan verifikasi konsisten untuk alamat checksummed", async () => {
    const { nonce, token, expiresAt } = issueNonce(account.address);
    const size = 1234;
    const name = "bukti.png";
    const signature = await account.signMessage({ message: message(nonce, token, size, name) });
    const res = await verifyAuth({ address: account.address, nonce, token, signature, size, name, expiresAt }, message(nonce, token, size, name));
    expect(res.ok).toBe(true);
  });

  it("token tetap valid saat alamat ditulis huruf besar semua", async () => {
    const { nonce, token, expiresAt } = issueNonce(account.address.toUpperCase());
    const size = 10;
    const name = "a.png";
    const signature = await account.signMessage({ message: message(nonce, token, size, name) });
    const res = await verifyAuth({ address: account.address, nonce, token, signature, size, name, expiresAt }, message(nonce, token, size, name));
    expect(res.ok).toBe(true);
  });

  it("menolak token yang bukan HMAC server", async () => {
    const { nonce, expiresAt } = issueNonce(account.address);
    const token = "0".repeat(64);
    const size = 1;
    const name = "a.png";
    const signature = await account.signMessage({ message: message(nonce, token, size, name) });
    const res = await verifyAuth({ address: account.address, nonce, token, signature, size, name, expiresAt }, message(nonce, token, size, name));
    expect(res.ok).toBe(false);
    expect(res.error).toBe("INVALID_TOKEN");
  });

  it("menolak tanda tangan dari wallet lain", async () => {
    const other = privateKeyToAccount("0x8b3a350cf5c34c9194ca85829a2df0ec3153be0318b5e2d3348e872092edffba");
    const { nonce, token, expiresAt } = issueNonce(account.address);
    const size = 1;
    const name = "a.png";
    const signature = await other.signMessage({ message: message(nonce, token, size, name) });
    const res = await verifyAuth({ address: account.address, nonce, token, signature, size, name, expiresAt }, message(nonce, token, size, name));
    expect(res.ok).toBe(false);
    expect(res.error).toBe("INVALID_SIGNATURE");
  });

  it("menolak token yang sudah kedaluwarsa", async () => {
    const { nonce, token } = issueNonce(account.address);
    const size = 1;
    const name = "a.png";
    const signature = await account.signMessage({ message: message(nonce, token, size, name) });
    const res = await verifyAuth(
      { address: account.address, nonce, token, signature, size, name, expiresAt: Date.now() - 1000 },
      message(nonce, token, size, name),
    );
    expect(res.ok).toBe(false);
    expect(res.error).toBe("INVALID_NONCE");
  });

  it("menolak replay setelah nonce dikonsumsi", async () => {
    const { nonce, token, expiresAt } = issueNonce(account.address);
    const size = 1;
    const name = "a.png";
    const signed = message(nonce, token, size, name);
    const signature = await account.signMessage({ message: signed });
    const body = { address: account.address, nonce, token, signature, size, name, expiresAt };

    expect((await verifyAuth(body, signed)).ok).toBe(true);
    const replay = await verifyAuth(body, signed);
    expect(replay.ok).toBe(false);
    expect(replay.error).toBe("INVALID_NONCE");
  });
});
