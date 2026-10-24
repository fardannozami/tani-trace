"use client";
import { useQuery } from "@tanstack/react-query";
import { usePublicClient } from "wagmi";
import { FUNDING_ADDRESS } from "../lib/contract";

export function useAuditFeed(campaignId?: bigint) {
  const publicClient = usePublicClient();
  return useQuery({
    queryKey: ["auditFeed", String(campaignId)],
    enabled: !!publicClient,
    queryFn: async () => {
      const latest = await publicClient!.getBlockNumber();
      const deploy = process.env.NEXT_PUBLIC_DEPLOY_BLOCK;
      const from = deploy ? BigInt(deploy) : latest > 40000n ? latest - 40000n : 0n;
      const logs = await publicClient!.getLogs({
        address: FUNDING_ADDRESS,
        fromBlock: from,
        toBlock: latest,
      });
      return logs;
    },
  });
}