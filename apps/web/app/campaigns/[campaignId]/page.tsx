"use client";
import { useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { Navigation } from "../../../components/Navigation";
import { useWallet } from "../../../hooks/useWallet";
import { useCampaign } from "../../../hooks/useCampaign";
import { useContractTx } from "../../../hooks/useContractTx";
import { useCampaignActions } from "../../../hooks/useCampaignActions";
import { useNowSeconds } from "../../../hooks/useNowSeconds";
import { useTokenInfo } from "../../../hooks/useTokenInfo";
import { usePublicClient } from "wagmi";
import { FUNDING_ADDRESS, TOKEN_ADDRESS, abi, isConfigured, EXPLORER_URL } from "../../../lib/contract";
import { formatTani, formatDate, formatAddress } from "../../../lib/format";
import { availableEscrow } from "../../../lib/types";
import { CampaignStatus } from "../../../lib/types";
import { ShareCampaignCard } from "../../../components/campaign/ShareCampaignCard";
import { StatusBadge } from "../../../components/campaign/StatusBadge";
import { EmptyState } from "../../../components/ui/EmptyState";
import { ErrorMessage } from "../../../components/ui/ErrorMessage";
import { TransactionStatus } from "../../../components/ui/TransactionStatus";
import { Skeleton } from "../../../components/ui/Skeleton";

export default function CampaignDetail() {
  const params = useParams();
  const id = BigInt(String(params?.campaignId ?? "0"));
  const { address, isConnected, isMonad } = useWallet();
  const { campaign, requests, contribution, isLoading, refetch } = useCampaign(id);
  const { execute: execTx, status, error, reset } = useContractTx();
  const actions = useCampaignActions();
  const now = useNowSeconds();
  const tokenInfo = useTokenInfo();
  const publicClient = usePublicClient();
  const [amount, setAmount] = useState("");
  const [allowance, setAllowance] = useState<bigint>(0n);

  // fetch allowance
  async function refreshAllowance() {
    if (!publicClient || !address) return;
    try {
      const a = await publicClient.readContract({ address: TOKEN_ADDRESS, abi: abi.token, functionName: "allowance", args: [address, FUNDING_ADDRESS] });
      setAllowance((a as bigint) ?? 0n);
    } catch {}
  }
  // call on mount
  if (publicClient && address) refreshAllowance();

  if (!isConfigured) return <><Navigation /><main className="page"><div className="notice">Kontrak belum dikonfigurasi.</div></main></>;
  if (isLoading) return <><Navigation /><main className="page"><Skeleton showProgress lines={4} /></main></>;
  if (!campaign) return <><Navigation /><main className="page"><EmptyState title="Campaign tidak ditemukan" /></main></>;

  const escrow = availableEscrow(campaign);
  const contribWei = contribution ?? 0n;
  const targetNum = Number(campaign.targetAmount);
  const raisedNum = Number(campaign.totalRaised);

  async function handleApprove() {
    if (!amount) return;
    const amt = BigInt(Math.round(Number(amount) * 1e18));
    try {
      await execTx({ address: TOKEN_ADDRESS, abi: abi.token, functionName: "approve", args: [FUNDING_ADDRESS, amt] });
      await refreshAllowance();
    } catch {}
  }
  async function handleContribute() {
    if (!amount) return;
    const amt = BigInt(Math.round(Number(amount) * 1e18));
    try {
      await execTx({ address: FUNDING_ADDRESS, abi: abi.funding, functionName: "contribute", args: [id, amt] });
      setAmount("");
      refetch();
      refreshAllowance();
    } catch {}
  }

  const needed = amount ? BigInt(Math.round(Number(amount) * 1e18)) : 0n;
  const needApprove = needed > 0n && allowance < needed;

  const url = typeof window !== "undefined" ? window.location.href : "";

  return (
    <>
      <Navigation />
      <main className="page">
        <div className="eyebrow">Campaign #{String(id)}</div>
        <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
          <h1 style={{ margin: 0 }}>{campaign.title}</h1>
          <StatusBadge status={campaign.status} />
        </div>
        <p style={{ color: "var(--muted)" }}>{campaign.crop} · {campaign.location}</p>
        <div className="meter"><span style={{ width: `${Math.min(100, targetNum > 0 ? (raisedNum / targetNum) * 100 : 0)}%` }} /></div>
        <p><strong>{formatTani(campaign.totalRaised)} TNC</strong> dari target {formatTani(campaign.targetAmount)} TNC · Escrow tersedia {formatTani(escrow)} TNC</p>
        <p>Deadline: {formatDate(campaign.fundingDeadline)} · {now < Number(campaign.fundingDeadline) ? `${Number(campaign.fundingDeadline) - now}s lagi` : "sudah lewat"}</p>
        <p>Petani: {formatAddress(campaign.farmer)}</p>
        <p>Rencana: {campaign.plan}</p>

        <ShareCampaignCard url={url} title={campaign.title} />

        {error ? <ErrorMessage error={error} onRetry={reset} /> : null}
        <TransactionStatus status={status} explorerUrl={EXPLORER_URL} />

        {/* Contributor actions */}
        {isConnected && campaign.status === CampaignStatus.FUNDING ? (
          <section style={{ marginTop: 24 }}>
            <h3>Kontribusi</h3>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
              <input type="number" placeholder="Jumlah TNC" value={amount} onChange={(e) => setAmount(e.target.value)} min="0" step="0.0001" />
              {needApprove ? (
                <button type="button" className="button secondary" onClick={handleApprove} disabled={!isMonad || status === "pending" || status === "awaiting-wallet"}>Approve</button>
              ) : null}
              <button type="button" className="button" onClick={handleContribute} disabled={!isMonad || status === "pending" || status === "awaiting-wallet" || needApprove}>Kontribusi</button>
            </div>
            <small>Saldo Anda: {formatTani(tokenInfo.balance)} TNC · Kontribusi Anda: {formatTani(contribWei)} TNC</small>
          </section>
        ) : null}

        {isConnected && address === campaign.farmer && campaign.status === CampaignStatus.ACTIVE ? (
          <section style={{ marginTop: 24 }}>
            <h3>Aksi petani</h3>
            <button type="button" className="button secondary" onClick={() => actions.completeCampaign(id)} disabled={status === "pending" || status === "awaiting-wallet"}>Selesaikan campaign</button>
          </section>
        ) : null}

        {isConnected && campaign.status === CampaignStatus.FAILED ? (
          <section style={{ marginTop: 24 }}>
            <h3>Refund</h3>
            {contribWei > 0n ? (
              <button type="button" className="button" onClick={() => actions.claimRefund(id)} disabled={status === "pending" || status === "awaiting-wallet"}>Klaim refund</button>
            ) : (
              <p>Anda tidak memiliki kontribusi pada campaign ini.</p>
            )}
          </section>
        ) : null}

        {isConnected && address === campaign.farmer && campaign.status === CampaignStatus.FUNDING && now >= Number(campaign.fundingDeadline) ? (
          <section style={{ marginTop: 24 }}>
            <h3>Finalisasi</h3>
            <button type="button" className="button secondary" onClick={() => actions.finalizeCampaign(id)} disabled={status === "pending" || status === "awaiting-wallet"}>Finalisasi campaign</button>
          </section>
        ) : null}

        <section style={{ marginTop: 24 }}>
          <h3>Pengajuan pencairan</h3>
          {requests.length === 0 ? <EmptyState title="Belum ada pengajuan" /> : (
            <ul>
              {requests.map((r) => (
                <li key={String(r.id)}>
                  <Link href={`/campaigns/${id}/requests/${r.id}`}>Request #{String(r.id)} · {formatTani(r.amount)} TNC · {r.purpose}</Link>
                  <StatusBadge status={r.status} domain="request" />
                </li>
              ))}
            </ul>
          )}
        </section>

        <section style={{ marginTop: 24 }}>
          <h3>Kontributor</h3>
          <p>{campaign.contributors.length} kontributor</p>
          <ul>{campaign.contributors.map((c) => <li key={c}>{formatAddress(c)}</li>)}</ul>
        </section>
      </main>
    </>
  );
}
