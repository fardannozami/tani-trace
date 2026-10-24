import { describe, it, expect } from "vitest";
import { computeManifestHash, buildManifest, verifyManifestHash } from "../lib/manifest";
import type { EvidenceManifest } from "../lib/manifest";

const base = {
  campaignId: 1n,
  requestId: 1n,
  farmer: "0x0000000000000000000000000000000000000001" as `0x${string}`,
  amount: 1000n,
  purpose: "pupuk",
  evidenceCid: "bafy",
  requestedAt: 1700000000n,
};

describe("manifest-advisory", () => {
  const onChainHash = computeManifestHash(base);

  it("hash unchanged when advisory added", () => {
    const m = buildManifest({ ...base, advisory: { summary: "x" } });
    expect(verifyManifestHash(m as EvidenceManifest, onChainHash)).toBe(true);
    expect(computeManifestHash({
      campaignId: m.campaignId, requestId: m.requestId, farmer: m.farmer as `0x${string}`,
      amount: m.amount, purpose: m.purpose, evidenceCid: m.evidenceCid, requestedAt: m.requestedAt,
    })).toBe(onChainHash);
  });

  it("hash unchanged when advisory removed", () => {
    const m = buildManifest({ ...base, advisory: null });
    expect(verifyManifestHash(m as EvidenceManifest, onChainHash)).toBe(true);
  });

  it("hash unchanged when advisory changed", () => {
    const m = buildManifest({ ...base, advisory: { summary: "changed", foo: 1 } });
    expect(verifyManifestHash(m as EvidenceManifest, onChainHash)).toBe(true);
  });

  it("verifyManifestHash stays true with advisory present", () => {
    const m = buildManifest({ ...base, advisory: { summary: "a", findings: [] } });
    expect(verifyManifestHash(m as EvidenceManifest, onChainHash)).toBe(true);
  });
});
