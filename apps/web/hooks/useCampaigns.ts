"use client";
import { useQuery } from "@tanstack/react-query";
import { usePublicClient } from "wagmi";
import { FUNDING_ADDRESS, abi } from "../lib/contract";
import { CampaignStatus, type Campaign } from "../lib/types";

async function fetchCampaign(publicClient: unknown, id: bigint): Promise<Campaign> {
  const pc = publicClient as { readContract: (args: unknown) => Promise<unknown> };
  const raw = (await pc.readContract({
    address: FUNDING_ADDRESS,
    abi: abi.funding,
    functionName: "campaigns",
    args: [id],
  })) as {
    farmer: `0x${string}`;
    title: string;
    crop: string;
    location: string;
    plan: string;
    targetAmount: bigint;
    totalRaised: bigint;
    releasedTotal: bigint;
    fundingDeadline: bigint;
    status: number | bigint;
    contributors: `0x${string}`[] | null | undefined;
  };
  return {
    id,
    farmer: raw.farmer,
    title: raw.title,
    crop: raw.crop,
    location: raw.location,
    plan: raw.plan,
    targetAmount: raw.targetAmount,
    totalRaised: raw.totalRaised,
    releasedTotal: raw.releasedTotal,
    fundingDeadline: raw.fundingDeadline,
    status: raw.status as CampaignStatus,
    contributors: raw.contributors ?? [],
  };
}

export function useCampaigns(statusFilter?: CampaignStatus) {
  const publicClient = usePublicClient();
  return useQuery({
    queryKey: ["campaigns", statusFilter],
    enabled: !!publicClient,
    queryFn: async () => {
      let ids: bigint[] = [];
      try {
        const res = await publicClient!.readContract({
          address: FUNDING_ADDRESS,
          abi: abi.funding,
          functionName: "getCampaignIds",
          args: [0n, 100n],
        });
        ids = (res as bigint[]) ?? [];
      } catch {
        const count = (await publicClient!.readContract({
          address: FUNDING_ADDRESS,
          abi: abi.funding,
          functionName: "campaignCount",
        })) as bigint;
        ids = [];
        for (let i = 1n; i <= count && i <= 100n; i++) ids.push(i);
      }
      const camps = await Promise.all(ids.map((id) => fetchCampaign(publicClient!, id)));
      if (statusFilter === undefined) return camps;
      return camps.filter((c) => c.status === statusFilter);
    },
  });
}