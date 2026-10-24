"use client";
import { useAccount, useConnect, useDisconnect, useChainId } from "wagmi";
import { monadTestnet } from "../lib/chain";

export function useWallet() {
  const account = useAccount();
  const { connect, connectors } = useConnect();
  const { disconnect } = useDisconnect();
  const chainId = useChainId();
  const isMonad = chainId === monadTestnet.id;
  return {
    address: account.address,
    isConnected: account.isConnected,
    chainId,
    isMonad,
    connect: () => connectors[0] && connect({ connector: connectors[0] }),
    disconnect,
  };
}

export function assertMonadTestnet(chainId: number) {
  if (chainId !== monadTestnet.id) throw new Error("wrong-network");
}