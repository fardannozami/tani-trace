"use client";
import { useQuery } from "@tanstack/react-query";
import { usePublicClient } from "wagmi";
import { FUNDING_ADDRESS, abi } from "../lib/contract";
import { decodeCampaign } from "../lib/decode";
import { type Campaign, type CampaignStatus } from "../lib/types";

async function fetchCampaign(publicClient: unknown, id: bigint): Promise<Campaign> {
  const pc = publicClient as { readContract: (args: unknown) => Promise<unknown> };
  const raw = await pc.readContract({
    address: FUNDING_ADDRESS,
    abi: abi.funding,
    functionName: "campaigns",
    args: [id],
  });
  return decodeCampaign(id, raw as readonly unknown[]);
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
