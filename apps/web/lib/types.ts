export enum CampaignStatus {
  FUNDING = 0,
  ACTIVE = 1,
  FAILED = 2,
  COMPLETED = 3,
}

export enum RequestStatus {
  PENDING = 0,
  APPROVED = 1,
  REJECTED = 2,
  EXPIRED = 3,
  PAID = 4,
}

export type Campaign = {
  id: bigint;
  farmer: `0x${string}`;
  title: string;
  crop: string;
  location: string;
  plan: string;
  targetAmount: bigint;
  totalRaised: bigint;
  releasedTotal: bigint;
  fundingDeadline: bigint;
  status: CampaignStatus;
  contributors: `0x${string}`[];
};

export type Request = {
  id: bigint;
  campaignId: bigint;
  farmer: `0x${string}`;
  amount: bigint;
  purpose: string;
  evidenceCid: string;
  manifestHash: `0x${string}`;
  requestedAt: bigint;
  votingDeadline: bigint;
  yesWeight: bigint;
  noWeight: bigint;
  status: RequestStatus;
};

export type Contribution = {
  campaignId: bigint;
  contributor: `0x${string}`;
  amount: bigint;
};

export function availableEscrow(c: { totalRaised: bigint; releasedTotal: bigint }): bigint {
  return c.totalRaised - c.releasedTotal;
}

export function quorumRequired(totalRaised: bigint): bigint {
  return (totalRaised * 5000n + 9999n) / 10000n;
}

export function totalVoted(r: { yesWeight: bigint; noWeight: bigint }): bigint {
  return r.yesWeight + r.noWeight;
}