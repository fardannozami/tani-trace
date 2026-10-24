"use client";
import { useConnect, useDisconnect } from "wagmi";
import { useWallet } from "../hooks/useWallet";

export function WalletButton() {
  const { address, isConnected } = useWallet();
  const { connect, connectors } = useConnect();
  const { disconnect } = useDisconnect();

  if (isConnected) {
    return (
      <button className="button secondary" onClick={() => disconnect()}>
        {address?.slice(0, 6)}…{address?.slice(-4)} · Keluar
      </button>
    );
  }
  return (
    <button className="button" onClick={() => connectors[0] && connect({ connector: connectors[0] })}>
      Hubungkan wallet
    </button>
  );
}
