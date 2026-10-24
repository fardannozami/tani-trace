"use client";
import { FUNDING_ADDRESS, abi } from "../lib/contract";
import { useContractTx } from "./useContractTx";

export function useCampaignActions() {
  const { execute, status, error, txHash, reset } = useContractTx();
  return {
    status,
    error,
    txHash,
    reset,
    finalizeCampaign: (id: bigint) =>
      execute({ address: FUNDING_ADDRESS, abi: abi.funding, functionName: "finalizeCampaign", args: [id] }),
    claimRefund: (id: bigint) =>
      execute({ address: FUNDING_ADDRESS, abi: abi.funding, functionName: "claimRefund", args: [id] }),
    payDisbursement: (requestId: bigint) =>
      execute({ address: FUNDING_ADDRESS, abi: abi.funding, functionName: "payDisbursement", args: [requestId] }),
    expireApprovedDisbursement: (requestId: bigint) =>
      execute({ address: FUNDING_ADDRESS, abi: abi.funding, functionName: "expireApprovedDisbursement", args: [requestId] }),
    completeCampaign: (id: bigint) =>
      execute({ address: FUNDING_ADDRESS, abi: abi.funding, functionName: "completeCampaign", args: [id] }),
    requestDisbursement: (id: bigint, amount: bigint, purpose: string, evidenceCid: string) =>
      execute({ address: FUNDING_ADDRESS, abi: abi.funding, functionName: "requestDisbursement", args: [id, amount, purpose, evidenceCid] }),
    vote: (requestId: bigint, support: boolean) =>
      execute({ address: FUNDING_ADDRESS, abi: abi.funding, functionName: "vote", args: [requestId, support] }),
    finalizeRequest: (requestId: bigint) =>
      execute({ address: FUNDING_ADDRESS, abi: abi.funding, functionName: "finalizeRequest", args: [requestId] }),
  };
}
