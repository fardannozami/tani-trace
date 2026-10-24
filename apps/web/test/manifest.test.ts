import { describe, it, expect } from "vitest";
import {
  MANIFEST_DOMAIN,
  computeManifestHash,
  buildManifest,
  serializeManifest,
  verifyManifestHash,
  type EvidenceManifest,
} from "../lib/manifest";

const base = {
  campaignId: 1n,
  requestId: 1n,
  farmer: "0x0000000000000000000000000000000000000001" as `0x${string}`,
  amount: 1000n,
  purpose: "pupuk",
  evidenceCid: "bafy",
  requestedAt: 1700000000n,
};

describe("manifest", () => {
  it("MANIFEST_DOMAIN is stable (32 bytes)", () => {
    expect(MANIFEST_DOMAIN).toBe("0x050e3690d1e559b6c9b9565d7e57bddb40e89d9970655821db4de973653bff34");
    expect(MANIFEST_DOMAIN.length).toBe(66);
  });

  it("computeManifestHash is deterministic", () => {
    const a = computeManifestHash(base);
    const b = computeManifestHash(base);
    expect(a).toBe(b);
  });

  it("identical input yields identical hash (cross type)", () => {
    const h1 = computeManifestHash({ ...base, campaignId: 1, requestId: "1", amount: "1000", requestedAt: 1700000000 });
    const h2 = computeManifestHash(base);
    expect(h1).toBe(h2);
  });

  it("changing each field changes the hash", () => {
    const h0 = computeManifestHash(base);
    expect(computeManifestHash({ ...base, campaignId: 2n })).not.toBe(h0);
    expect(computeManifestHash({ ...base, requestId: 2n })).not.toBe(h0);
    expect(computeManifestHash({ ...base, farmer: "0x0000000000000000000000000000000000000002" as `0x${string}` })).not.toBe(h0);
    expect(computeManifestHash({ ...base, amount: 1001n })).not.toBe(h0);
    expect(computeManifestHash({ ...base, purpose: "bibit" })).not.toBe(h0);
    expect(computeManifestHash({ ...base, evidenceCid: "bafz" })).not.toBe(h0);
    expect(computeManifestHash({ ...base, requestedAt: 1700000001n })).not.toBe(h0);
  });

  it("requestedAt encodes uint64 safely for large values", () => {
    const big = 18446744073709551615n; // max uint64
    const h = computeManifestHash({ ...base, requestedAt: big });
    expect(h).toMatch(/^0x[0-9a-f]{64}$/);
    // recompute same
    expect(computeManifestHash({ ...base, requestedAt: big })).toBe(h);
  });

  it("verifyManifestHash true/false", () => {
    const m = buildManifest(base);
    const h = computeManifestHash(base);
    expect(verifyManifestHash(m as EvidenceManifest, h)).toBe(true);
    expect(verifyManifestHash(m as EvidenceManifest, "0x0000000000000000000000000000000000000000000000000000000000000000" as `0x${string}`)).toBe(false);
  });

  it("buildManifest copies fields", () => {
    const m = buildManifest({ ...base, files: [{ name: "a.jpg", cid: "cid1", mime: "image/jpeg", size: 10 }], advisory: { summary: "s" } });
    expect(m.campaignId).toBe(base.campaignId);
    expect(m.requestId).toBe(base.requestId);
    expect(m.farmer).toBe(base.farmer);
    expect(m.amount).toBe("1000");
    expect(m.purpose).toBe(base.purpose);
    expect(m.evidenceCid).toBe(base.evidenceCid);
    expect(m.requestedAt).toBe(base.requestedAt);
    expect(m.files).toHaveLength(1);
    expect(m.advisory).toEqual({ summary: "s" });
  });

  it("serializeManifest JSON round-trips", () => {
    const m = buildManifest({ campaignId: "1", requestId: "1", farmer: base.farmer, amount: 1000n, purpose: "pupuk", evidenceCid: "bafy", requestedAt: "1700000000" });
    const s = serializeManifest(m);
    const parsed = JSON.parse(s);
    expect(parsed).toEqual(m);
  });

  it("Solidity parity input yields verified hash", () => {
    // cross-checked via forge: TaniTraceFunding.computeManifestHash(1,1,0x...0001,1000,"pupuk","bafy",1700000000)
    // == viem computeManifestHash on same input == 0x72d070d75616a6b3412198d902ec0aae4defa57af7f5c292039b75b06dd721c0
    const h = computeManifestHash(base);
    expect(h).toBe("0x72d070d75616a6b3412198d902ec0aae4defa57af7f5c292039b75b06dd721c0");
    const m = buildManifest(base);
    expect(verifyManifestHash(m as EvidenceManifest, h)).toBe(true);
  });

  it("hash is bytes32 hex", () => {
    const h = computeManifestHash(base);
    expect(h).toMatch(/^0x[0-9a-f]{64}$/);
  });
});
