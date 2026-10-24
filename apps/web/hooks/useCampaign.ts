"use client";
import { useQuery } from "@tanstack/react-query";
import { usePublicClient, useAccount } from "wagmi";
import { FUNDING_ADDRESS, abi } from "../lib/contract";
import { CampaignStatus, RequestStatus, type Campaign, type Request } from "../lib/types";

function toCampaign(id: bigint, raw: unknown): Campaign {
  const r = raw as {
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
    farmer: r.farmer,
    title: r.title,
    crop: r.crop,
    location: r.location,
    plan: r.plan,
    targetAmount: r.targetAmount,
    totalRaised: r.totalRaised,
    releasedTotal: r.releasedTotal,
    fundingDeadline: r.fundingDeadline,
    status: r.status as CampaignStatus,
    contributors: r.contributors ?? [],
  };
}

function toRequest(id: bigint, raw: unknown): Request {
  const r = raw as {
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
    status: number | bigint;
  };
  return {
    id,
    campaignId: r.campaignId,
    farmer: r.farmer,
    amount: r.amount,
    purpose: r.purpose,
    evidenceCid: r.evidenceCid,
    manifestHash: r.manifestHash,
    requestedAt: r.requestedAt,
    votingDeadline: r.votingDeadline,
    yesWeight: r.yesWeight,
    noWeight: r.noWeight,
    status: r.status as RequestStatus,
  };
}

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
      return toCampaign(campaignId!, raw);
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
        out.push(toRequest(rid, raw));
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