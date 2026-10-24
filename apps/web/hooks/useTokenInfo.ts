"use client";
import { useReadContract } from "wagmi";
import { TOKEN_ADDRESS, FAUCET_ADDRESS, abi } from "../lib/contract";
import { useWallet } from "./useWallet";
import { useContractTx } from "./useContractTx";

export function useTokenInfo() {
  const { address } = useWallet();
  const balance = useReadContract({
    address: TOKEN_ADDRESS,
    abi: abi.token,
    functionName: "balanceOf",
    args: address ? [address] : undefined,
    query: { enabled: !!address },
  });
  const claimed = useReadContract({
    address: FAUCET_ADDRESS,
    abi: abi.faucet,
    functionName: "claimed",
    args: address ? [address] : undefined,
    query: { enabled: !!address },
  });
  const claimAmount = useReadContract({
    address: FAUCET_ADDRESS,
    abi: abi.faucet,
    functionName: "claimAmount",
  });
  const { execute, status, txHash, error, reset } = useContractTx();
  async function claim() {
    return execute({ address: FAUCET_ADDRESS, abi: abi.faucet, functionName: "claim", args: [] });
  }
  return {
    balance: (balance.data as bigint | undefined) ?? 0n,
    claimed: (claimed.data as boolean | undefined) ?? false,
    claimAmount: (claimAmount.data as bigint | undefined) ?? 0n,
    claim,
    status,
    txHash,
    error,
    reset,
    refetch: balance.refetch,
  };
}
