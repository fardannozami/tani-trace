import { describe, expect, it } from "vitest";
import { decodeCampaign, decodeRequest } from "../lib/decode";
import { CampaignStatus, RequestStatus } from "../lib/types";

// Bentuk nyata yang dikembalikan viem untuk getter multi-output: array posisional,
// bukan objek. Diambil dari campaigns(1) di Monad Testnet.
const campaignRaw = [
  "0xAdd7A55Df3A7933eC3B0A0B36A73594360D6bD91",
  "tanam padi",
  "padi",
  "Bantul",
  "untuk beli benih",
  10000000000000000000n,
  0n,
  0n,
  1792819800n,
  0,
] as const;

const requestRaw = [
  1n,
  "0xAdd7A55Df3A7933eC3B0A0B36A73594360D6bD91",
  300000000000000000000n,
  "benih",
  "bafybeigdyrzt5sfp7udm7hu76uh7y26nf3eh", 
  `0x${"ab".repeat(32)}`,
  1700000000n,
  1700086400n,
  600000000000000000000n,
  400000000000000000000n,
  0,
] as const;

describe("decodeCampaign", () => {
  it("memetakan array posisional campaigns() dengan benar", () => {
    const c = decodeCampaign(1n, campaignRaw);
    expect(c.id).toBe(1n);
    expect(c.farmer).toBe(campaignRaw[0]);
    expect(c.title).toBe("tanam padi");
    expect(c.crop).toBe("padi");
    expect(c.location).toBe("Bantul");
    expect(c.plan).toBe("untuk beli benih");
    expect(c.targetAmount).toBe(10n ** 19n);
    expect(c.totalRaised).toBe(0n);
    expect(c.releasedTotal).toBe(0n);
    expect(c.fundingDeadline).toBe(1792819800n);
    expect(c.status).toBe(CampaignStatus.FUNDING);
    expect(c.contributors).toEqual([]);
  });

  it("tidak melempar saat array kosong", () => {
    const c = decodeCampaign(9n, []);
    expect(c.id).toBe(9n);
    expect(c.targetAmount).toBe(0n);
    expect(c.title).toBe("");
    expect(c.status).toBe(CampaignStatus.FUNDING);
  });
});

describe("decodeRequest", () => {
  it("memetakan array posisional requests() dengan benar", () => {
    const r = decodeRequest(7n, requestRaw);
    expect(r.id).toBe(7n);
    expect(r.campaignId).toBe(1n);
    expect(r.amount).toBe(300n * 10n ** 18n);
    expect(r.purpose).toBe("benih");
    expect(r.manifestHash).toBe(requestRaw[5]);
    expect(r.votingDeadline).toBe(1700086400n);
    expect(r.yesWeight).toBe(600n * 10n ** 18n);
    expect(r.noWeight).toBe(400n * 10n ** 18n);
    expect(r.status).toBe(RequestStatus.PENDING);
  });
});
