import { encodeAbiParameters, keccak256, toBytes, type Hex } from "viem";

export const MANIFEST_DOMAIN: Hex = keccak256(toBytes("TaniTrace.DisbursementManifest.v1"));

export type EvidenceFile = {
  name: string;
  cid: string;
  mime: string;
  size: number;
};

export type AdvisoryReport = {
  summary?: string;
  [key: string]: unknown;
};

export type EvidenceManifest = {
  campaignId: string | number | bigint;
  requestId: string | number | bigint;
  farmer: string;
  amount: string;
  purpose: string;
  evidenceCid: string;
  requestedAt: string | number | bigint;
  files?: EvidenceFile[];
  advisory?: AdvisoryReport | null;
};

export function computeManifestHash(params: {
  campaignId: bigint | number | string;
  requestId: bigint | number | string;
  farmer: `0x${string}`;
  amount: bigint | number | string;
  purpose: string;
  evidenceCid: string;
  requestedAt: bigint | number | string;
}): Hex {
  const domain = MANIFEST_DOMAIN;
  const data = encodeAbiParameters(
    [
      { type: "bytes32" },
      { type: "uint256" },
      { type: "uint256" },
      { type: "address" },
      { type: "uint256" },
      { type: "string" },
      { type: "string" },
      { type: "uint64" },
    ],
    [
      domain,
      BigInt(params.campaignId),
      BigInt(params.requestId),
      params.farmer,
      BigInt(params.amount),
      params.purpose,
      params.evidenceCid,
      BigInt(params.requestedAt),
    ],
  );
  return keccak256(data);
}

export function buildManifest(input: {
  campaignId: bigint | number | string;
  requestId: bigint | number | string;
  farmer: `0x${string}`;
  amount: bigint | number | string;
  purpose: string;
  evidenceCid: string;
  requestedAt: bigint | number | string;
  files?: EvidenceFile[];
  advisory?: AdvisoryReport | null;
}): EvidenceManifest {
  return {
    campaignId: input.campaignId,
    requestId: input.requestId,
    farmer: input.farmer,
    amount: String(input.amount),
    purpose: input.purpose,
    evidenceCid: input.evidenceCid,
    requestedAt: input.requestedAt,
    files: input.files,
    advisory: input.advisory ?? null,
  };
}

export function serializeManifest(m: EvidenceManifest): string {
  return JSON.stringify(m);
}

export function verifyManifestHash(m: EvidenceManifest, onChainHash: Hex): boolean {
  const h = computeManifestHash({
    campaignId: m.campaignId,
    requestId: m.requestId,
    farmer: m.farmer as `0x${string}`,
    amount: m.amount,
    purpose: m.purpose,
    evidenceCid: m.evidenceCid,
    requestedAt: m.requestedAt,
  });
  return h === onChainHash;
}