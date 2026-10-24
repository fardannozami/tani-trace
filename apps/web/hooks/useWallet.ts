"use client";
import { useEffect, useState } from "react";
import { useAccount, useConnect, useDisconnect, useChainId } from "wagmi";
import { monadTestnet } from "../lib/chain";

export function useWallet() {
  const account = useAccount();
  const { connect, connectors } = useConnect();
  const { disconnect } = useDisconnect();
  const chainId = useChainId();

  // wagmi memulihkan koneksi dari localStorage saat hidrasi, sedangkan HTML
  // server selalu "belum terhubung". Nilai koneksi dimask sampai mount agar
  // render pertama klien identik dengan server (mencegah hydration mismatch).
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const isMonad = mounted && chainId === monadTestnet.id;
  return {
    address: mounted ? account.address : undefined,
    isConnected: mounted && account.isConnected,
    chainId,
    isMonad,
    connect: () => connectors[0] && connect({ connector: connectors[0] }),
    disconnect,
  };
}

export function assertMonadTestnet(chainId: number) {
  if (chainId !== monadTestnet.id) throw new Error("wrong-network");
}
