"use client";
import { Navigation } from "../../components/Navigation";
import { useWallet } from "../../hooks/useWallet";
import { useTokenInfo } from "../../hooks/useTokenInfo";
import { isConfigured } from "../../lib/contract";
import { formatTani } from "../../lib/format";
import { TransactionStatus } from "../../components/ui/TransactionStatus";

import { EmptyState } from "../../components/ui/EmptyState";

export default function Faucet() {
  const { isConnected, isMonad } = useWallet();
  const info = useTokenInfo();

  return (
    <>
      <Navigation />
      <main className="page">
        <div className="eyebrow">Monad Testnet</div>
        <h1>TNC Faucet</h1>
        {!isConfigured ? <div className="notice">Kontrak belum dikonfigurasi.</div> : null}
        <p>Satu wallet dapat mengklaim {formatTani(info.claimAmount)} TNC simulasi.</p>
        <p>Saldo Anda: {formatTani(info.balance)} TNC</p>
        <p>Status klaim: {info.claimed ? "Sudah diklaim" : "Belum diklaim"}</p>
        <TransactionStatus status={info.status} />
        <button
          type="button"
          className="button"
          onClick={() => info.claim()}
          disabled={!isConnected || !isMonad || info.claimed || info.status === "pending" || info.status === "awaiting-wallet"}
        >
          Klaim TNC
        </button>
        {!isConnected ? <p>Hubungkan wallet terlebih dahulu.</p> : null}
        {info.claimed ? <EmptyState title="Sudah diklaim" description="Wallet ini sudah mengklaim TNC dari faucet." /> : null}
      </main>
    </>
  );
}
