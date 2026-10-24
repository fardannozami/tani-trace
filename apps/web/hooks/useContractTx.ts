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

function collectErrorText(err: unknown): string {
  const parts: string[] = [];
  let current: unknown = err;
  let depth = 0;

  while (current && depth < 4) {
    if (typeof current === "string") {
      parts.push(current);
      break;
    }
    if (current instanceof Error) {
      parts.push(current.message);
      current = (current as Error & { cause?: unknown }).cause;
      depth += 1;
      continue;
    }
    if (typeof current !== "object") break;
    const value = current as Record<string, unknown>;
    for (const key of ["message", "shortMessage", "details", "reason"]) {
      if (typeof value[key] === "string") parts.push(value[key] as string);
    }
    current = value.cause;
    depth += 1;
  }

  return parts.join(" ");
}

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
  const msg = collectErrorText(err);
  const normalized = msg.toLowerCase();
  if (normalized.includes("user rejected") || normalized.includes("user denied")) return "Transaksi dibatalkan dari wallet.";
  if (normalized.includes("wrong-network") || normalized.includes("chain mismatch")) return "Wallet belum berada di Monad Testnet.";
  if (normalized.includes("rate limit") || normalized.includes("too many requests") || normalized.includes("429")) {
    return "Jaringan sedang sibuk. Tunggu beberapa detik, lalu coba lagi.";
  }
  if (normalized.includes("internal error") || normalized.includes("failed to fetch") || normalized.includes("rpc")) {
    return "Koneksi ke jaringan sedang mengalami gangguan. Tunggu sebentar, lalu coba lagi.";
  }
  if (normalized.includes("insufficient funds") || normalized.includes("insufficient balance")) {
    return "Saldo MON tidak cukup untuk biaya transaksi. Isi MON testnet, lalu coba lagi.";
  }
  return msg || "Transaksi gagal. Periksa wallet dan jaringan, lalu coba lagi.";
}

export function useContractTx() {
  const { data: walletClient } = useWalletClient();
  const publicClient = usePublicClient();
  const chainId = useChainId();
  const [status, setStatus] = useState<TxStatus>("idle");
  const [error, setError] = useState<string | null>(null);
  const [txHash, setTxHash] = useState<`0x${string}` | null>(null);

  const execute = useCallback(
    async (params: { address: `0x${string}`; abi: unknown; functionName: string; args?: readonly unknown[] }) => {
      setError(null);
      setTxHash(null);
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
        setTxHash(hash);
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

  return { execute, status, error, txHash, reset: () => { setStatus("idle"); setError(null); setTxHash(null); } };
}
