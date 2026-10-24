"use client";
import { useQuery } from "@tanstack/react-query";
import { usePublicClient, useAccount } from "wagmi";
import { FUNDING_ADDRESS, abi } from "../lib/contract";
import { decodeCampaign, decodeRequest } from "../lib/decode";
import type { Request } from "../lib/types";

export function useCampaign(campaignId: bigint | undefined) {
  const publicClient = usePublicClient();
  const { address } = useAccount();

  const campaignQuery = useQuery({
    queryKey: ["campaign", String(campaignId)],
    enabled: !!publicClient && campaignId !== undefined,
    queryFn: async () => {
      const raw = await publicClient!.readContract({
        address: FUNDING_ADDRESS,
        abi: abi.funding,
        functionName: "campaigns",
        args: [campaignId!],
      });
      return decodeCampaign(campaignId!, raw as readonly unknown[]);
    },
  });

  const idsQuery = useQuery({
    queryKey: ["campaignRequestIds", String(campaignId)],
    enabled: !!publicClient && campaignId !== undefined,
    queryFn: async () => {
      const res = await publicClient!.readContract({
        address: FUNDING_ADDRESS,
        abi: abi.funding,
        functionName: "getCampaignRequestIds",
        args: [campaignId!],
      });
      return (res as bigint[]) ?? [];
    },
  });

  const requestsQuery = useQuery({
    queryKey: ["requests", String(campaignId), (idsQuery.data ?? []).map(String).join(",")],
    enabled: !!publicClient && !!idsQuery.data,
    queryFn: async () => {
      const ids = idsQuery.data ?? [];
      const out: Request[] = [];
      for (const rid of ids) {
        const raw = await publicClient!.readContract({
          address: FUNDING_ADDRESS,
          abi: abi.funding,
          functionName: "requests",
          args: [rid],
        });
        out.push(decodeRequest(rid, raw as readonly unknown[]));
      }
      return out;
    },
  });

  const contributionQuery = useQuery({
    queryKey: ["contribution", String(campaignId), address],
    enabled: !!publicClient && campaignId !== undefined && !!address,
    queryFn: async () => {
      const res = await publicClient!.readContract({
        address: FUNDING_ADDRESS,
        abi: abi.funding,
        functionName: "contributionOf",
        args: [campaignId!, address!],
      });
      return (res as bigint) ?? 0n;
    },
  });

  return {
    campaign: campaignQuery.data,
    requests: requestsQuery.data ?? [],
    requestIds: idsQuery.data ?? [],
    contribution: contributionQuery.data ?? 0n,
    isLoading: campaignQuery.isLoading || idsQuery.isLoading || requestsQuery.isLoading,
    refetch: () => {
      campaignQuery.refetch();
      idsQuery.refetch();
      requestsQuery.refetch();
      contributionQuery.refetch();
    },
  };
}

export function useVote(requestId: bigint | undefined, voter: `0x${string}` | undefined) {
  const publicClient = usePublicClient();
  return useQuery({
    queryKey: ["voted", String(requestId), voter],
    enabled: !!publicClient && requestId !== undefined && !!voter,
    queryFn: async () => {
      const res = await publicClient!.readContract({
        address: FUNDING_ADDRESS,
        abi: abi.funding,
        functionName: "voted",
        args: [requestId!, voter!],
      });
      return (res as boolean) ?? false;
    },
  });
}
