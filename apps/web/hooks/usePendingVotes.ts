"use client";
import { useQuery } from "@tanstack/react-query";
import { useAccount, usePublicClient } from "wagmi";
import { FUNDING_ADDRESS, abi, isConfigured } from "../lib/contract";
import { decodeCampaign, decodeRequest } from "../lib/decode";
import { RequestStatus, type Request } from "../lib/types";

export type PendingVote = {
  campaignId: bigint;
  campaignTitle: string;
  campaignTotalRaised: bigint;
  request: Request;
  userVoted: boolean;
};

export function usePendingVotes() {
  const publicClient = usePublicClient();
  const { address } = useAccount();

  const votesQuery = useQuery({
    queryKey: ["pendingVotes", address],
    enabled: !!publicClient && isConfigured,
    staleTime: 15_000,
    refetchInterval: 30_000,
    queryFn: async (): Promise<PendingVote[]> => {
      const campaignCount = await publicClient!.readContract({
        address: FUNDING_ADDRESS,
        abi: abi.funding,
        functionName: "campaignCount",
      }) as bigint;
      const campaignIds: bigint[] = [];
      for (let offset = 0n; offset < campaignCount; offset += 100n) {
        const ids = await publicClient!.readContract({
          address: FUNDING_ADDRESS,
          abi: abi.funding,
          functionName: "getCampaignIds",
          args: [offset, 100n],
        });
        campaignIds.push(...(ids as bigint[]));
      }

      const campaigns = await Promise.all(campaignIds.map(async (id) => {
        const raw = await publicClient!.readContract({
          address: FUNDING_ADDRESS,
          abi: abi.funding,
          functionName: "campaigns",
          args: [id],
        });
        return decodeCampaign(id, raw as readonly unknown[]);
      }));
      const requestIdsByCampaign = await Promise.all(campaigns.map(async (campaign) => {
        const ids = await publicClient!.readContract({
          address: FUNDING_ADDRESS,
          abi: abi.funding,
          functionName: "getCampaignRequestIds",
          args: [campaign.id],
        });
        return { campaign, ids: ids as bigint[] };
      }));

      const requestRefs = requestIdsByCampaign.flatMap(({ campaign, ids }) =>
        ids.map((requestId) => ({ campaign, requestId })),
      );
      const now = BigInt(Math.floor(Date.now() / 1000));
      const requests = await Promise.all(requestRefs.map(async ({ campaign, requestId }) => {
        const raw = await publicClient!.readContract({
          address: FUNDING_ADDRESS,
          abi: abi.funding,
          functionName: "requests",
          args: [requestId],
        });
        const request = decodeRequest(requestId, raw as readonly unknown[]);
        if (request.status !== RequestStatus.PENDING || request.votingDeadline < now) return null;
        const userVoted = address
          ? await publicClient!.readContract({
              address: FUNDING_ADDRESS,
              abi: abi.funding,
              functionName: "voted",
              args: [requestId, address],
            }) as boolean
          : false;
        return { campaignId: campaign.id, campaignTitle: campaign.title, campaignTotalRaised: campaign.totalRaised, request, userVoted };
      }));

      return requests.filter((item): item is PendingVote => item !== null);
    },
  });

  return {
    votes: votesQuery.data ?? [],
    isLoading: votesQuery.isLoading,
    error: votesQuery.error,
    refetch: votesQuery.refetch,
  };
}
