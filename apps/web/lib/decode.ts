import { CampaignStatus, RequestStatus, type Campaign, type Request } from "./types";

/**
 * viem mengembalikan **array posisional** (bukan objek) untuk fungsi dengan
 * banyak output. Urutan field mengikuti struct di
 * `contracts/src/TaniTraceFunding.sol`.
 *
 * Catatan: getter publik `campaigns(uint256)` tidak menyertakan array dinamis
 * `contributors`, jadi field itu diisi array kosong. Gunakan `getCampaign(id)`
 * bila daftar kontributor dibutuhkan.
 */
export function decodeCampaign(id: bigint, raw: readonly unknown[]): Campaign {
  return {
    id,
    farmer: raw[0] as `0x${string}`,
    title: String(raw[1] ?? ""),
    crop: String(raw[2] ?? ""),
    location: String(raw[3] ?? ""),
    plan: String(raw[4] ?? ""),
    targetAmount: (raw[5] as bigint) ?? 0n,
    totalRaised: (raw[6] as bigint) ?? 0n,
    releasedTotal: (raw[7] as bigint) ?? 0n,
    fundingDeadline: (raw[8] as bigint) ?? 0n,
    status: Number(raw[9] ?? 0) as CampaignStatus,
    contributors: [],
  };
}

/**
 * Getter publik `requests(uint256)` — urutan field:
 * campaignId, farmer, amount, purpose, evidenceCid, manifestHash,
 * requestedAt, votingDeadline, yesWeight, noWeight, status.
 */
export function decodeRequest(id: bigint, raw: readonly unknown[]): Request {
  return {
    id,
    campaignId: (raw[0] as bigint) ?? 0n,
    farmer: raw[1] as `0x${string}`,
    amount: (raw[2] as bigint) ?? 0n,
    purpose: String(raw[3] ?? ""),
    evidenceCid: String(raw[4] ?? ""),
    manifestHash: raw[5] as `0x${string}`,
    requestedAt: (raw[6] as bigint) ?? 0n,
    votingDeadline: (raw[7] as bigint) ?? 0n,
    yesWeight: (raw[8] as bigint) ?? 0n,
    noWeight: (raw[9] as bigint) ?? 0n,
    status: Number(raw[10] ?? 0) as RequestStatus,
  };
}
