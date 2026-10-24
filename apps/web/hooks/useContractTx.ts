"use client";
import { useState, useCallback } from "react";
import { useWalletClient, usePublicClient, useChainId } from "wagmi";
import { encodeFunctionData, decodeErrorResult } from "viem";
import type { Abi } from "abitype";
import { monadTestnet } from "../lib/chain";
import { isConfigured } from "../lib/contract";
import { abi } from "../lib/contract";
import { assertMonadTestnet } from "./useWallet";

export type TxStatus = "idle" | "awaiting-wallet" | "pending" | "success" | "error";

const ERROR_MESSAGES: Record<string, string> = {
  InvalidStatus: "Status campaign/pengajuan tidak sesuai.",
  InvalidAmount: "Jumlah tidak valid.",
  DeadlinePassed: "Batas waktu telah lewat.",
  NotFarmer: "Hanya petani pemilik campaign.",
  NotContributor: "Anda bukan kontributor.",
  AlreadyVoted: "Anda sudah memberikan suara.",
  VotingStillOpen: "Voting masih berlangsung.",
  EscrowShortfall: "Dana escrow tidak mencukupi.",
};

export function explainContractRevert(err: unknown): string {
  try {
    const e = err as { data?: `0x${string}`; cause?: { data?: `0x${string}` } };
    const data = e?.data || e?.cause?.data;
    if (data) {
      const decoded = decodeErrorResult({ abi: abi.funding, data });
      const name = decoded?.errorName;
      if (name && ERROR_MESSAGES[name]) return ERROR_MESSAGES[name];
      if (name) return name;
    }
  } catch {
    // ignore
  }
  const msg = err instanceof Error ? err.message : String(err);
  if (msg.includes("User rejected") || msg.includes("user rejected")) return "Transaksi dibatalkan pengguna.";
  if (msg.includes("wrong-network")) return "Jaringan bukan Monad Testnet.";
  return msg;
}

export function useContractTx() {
  const { data: walletClient } = useWalletClient();
  const publicClient = usePublicClient();
  const chainId = useChainId();
  const [status, setStatus] = useState<TxStatus>("idle");
  const [error, setError] = useState<string | null>(null);

  const execute = useCallback(
    async (params: { address: `0x${string}`; abi: unknown; functionName: string; args?: readonly unknown[] }) => {
      setError(null);
      setStatus("idle");
      try {
        assertMonadTestnet(chainId);
        if (!walletClient) throw new Error("wallet-missing");
        if (!isConfigured) throw new Error("not-configured");
        setStatus("awaiting-wallet");
        const data = encodeFunctionData({ abi: params.abi as Abi, functionName: params.functionName, args: params.args ?? [] });
        const estimate = await publicClient!.estimateGas({
          account: walletClient.account,
          to: params.address,
          data,
        });
        const gas = estimate + estimate / 10n;
        const hash = await walletClient.sendTransaction({
          to: params.address,
          data,
          gas,
          chain: monadTestnet,
        });
        setStatus("pending");
        const receipt = await publicClient!.waitForTransactionReceipt({ hash });
        if (receipt.status !== "success") throw new Error("transaction failed");
        setStatus("success");
        return receipt;
      } catch (err) {
        setStatus("error");
        setError(explainContractRevert(err));
        throw err;
      }
    },
    [walletClient, publicClient, chainId],
  );

  return { execute, status, error, reset: () => { setStatus("idle"); setError(null); } };
}