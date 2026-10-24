"use client";
import { useEffect, useState } from "react";
import { useConnect, useDisconnect } from "wagmi";
import { useWallet } from "../hooks/useWallet";

export function WalletButton() {
  const { address, isConnected } = useWallet();
  const { connect, connectors, error, isPending } = useConnect();
  const { disconnect } = useDisconnect();
  const [showInstall, setShowInstall] = useState(false);

  useEffect(() => {
    if (error) setShowInstall(true);
  }, [error]);

  if (isConnected) {
    return (
      <button className="button secondary" onClick={() => disconnect()}>
        {address?.slice(0, 6)}…{address?.slice(-4)} · Keluar
      </button>
    );
  }

  const handleConnect = () => {
    const hasBrowserWallet = typeof window !== "undefined" && "ethereum" in window;
    if (!hasBrowserWallet || !connectors[0]) {
      setShowInstall(true);
      return;
    }
    setShowInstall(false);
    connect({ connector: connectors[0] });
  };

  return (
    <div className="wallet-connect-wrap">
      <button className="button" onClick={handleConnect} disabled={isPending}>
        {isPending ? "Membuka wallet…" : "Hubungkan wallet"}
      </button>
      {showInstall ? (
        <div className="wallet-install" role="dialog" aria-label="Install wallet">
          <strong>Wallet belum terdeteksi</strong>
          <span>Install salah satu wallet berikut, lalu muat ulang halaman:</span>
          <div className="wallet-install-links">
            <a href="https://metamask.io/download/" target="_blank" rel="noreferrer">MetaMask ↗</a>
            <a href="https://www.coinbase.com/wallet/downloads" target="_blank" rel="noreferrer">Coinbase Wallet ↗</a>
            <a href="https://phantom.com/download" target="_blank" rel="noreferrer">Phantom ↗</a>
          </div>
          <button type="button" className="wallet-install-close" onClick={() => setShowInstall(false)}>Tutup</button>
        </div>
      ) : null}
    </div>
  );
}
