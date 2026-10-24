"use client";
import { useEffect, useState } from "react";
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
import { formatTani, formatDate, formatAddress, parseTani, countdown } from "../../../lib/format";
import { availableEscrow, CampaignStatus, RequestStatus } from "../../../lib/types";
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
  const { execute: execTx, status, error, txHash, reset } = useContractTx();
  const actions = useCampaignActions();
  const now = useNowSeconds();
  const tokenInfo = useTokenInfo();
  const publicClient = usePublicClient();
  const [amount, setAmount] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [allowance, setAllowance] = useState<bigint>(0n);
  const [shareUrl, setShareUrl] = useState("");

  // fetch allowance
  async function refreshAllowance() {
    if (!publicClient || !address) return;
    try {
      const a = await publicClient.readContract({ address: TOKEN_ADDRESS, abi: abi.token, functionName: "allowance", args: [address, FUNDING_ADDRESS] });
      setAllowance((a as bigint) ?? 0n);
    } catch {}
  }
  // useEffect (bukan saat render) agar tidak memicu pembacaan berulang
  useEffect(() => {
    let cancelled = false;
    if (!publicClient || !address) {
      setAllowance(0n);
      return;
    }
    publicClient
      .readContract({ address: TOKEN_ADDRESS, abi: abi.token, functionName: "allowance", args: [address, FUNDING_ADDRESS] })
      .then((a) => { if (!cancelled) setAllowance((a as bigint) ?? 0n); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [publicClient, address]);

  // URL baru tersedia di klien; render pertama memakai "" agar sama dengan server.
  useEffect(() => setShareUrl(window.location.href), []);

  // Setelah transaksi sukses, data campaign harus di-refresh supaya status,
  // escrow, dan kontribusi ikut berubah tanpa reload manual.
  useEffect(() => {
    if (status === "success") refetch();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status]);

  if (!isConfigured) return <><Navigation /><main className="page"><div className="notice">Kontrak belum dikonfigurasi.</div></main></>;
  if (isLoading) return <><Navigation /><main className="page"><Skeleton showProgress lines={4} /></main></>;
  if (!campaign) return <><Navigation /><main className="page"><EmptyState title="Campaign tidak ditemukan" /></main></>;

  const escrow = availableEscrow(campaign);
  const contribWei = contribution ?? 0n;
  const targetNum = Number(campaign.targetAmount);
  const raisedNum = Number(campaign.totalRaised);

  // Deadline lewat = pendanaan ditutup. Status on-chain tetap FUNDING sampai
  // ada yang memanggil finalizeCampaign, jadi UI harus menjelaskan state ini.
  const deadlinePassed = now !== null && now >= Number(campaign.fundingDeadline);
  const remainingWei = campaign.targetAmount > campaign.totalRaised ? campaign.targetAmount - campaign.totalRaised : 0n;
  const targetReached = campaign.totalRaised >= campaign.targetAmount;
  const amountWei = parseTani(amount);
  const overLimit = amountWei !== null && amountWei > remainingWei;
  const insufficientBalance = amountWei !== null && amountWei > tokenInfo.balance;
  const countdownText = now === null ? null : deadlinePassed ? "sudah berakhir" : countdown(Number(campaign.fundingDeadline) - now);

  async function handleApprove() {
    const amt = amountWei;
    if (!amt) {
      setFormError("Masukkan jumlah TNC yang valid (lebih dari 0).");
      return;
    }
    if (amt > remainingWei) {
      setFormError(`Jumlah melebihi sisa target. Maksimal ${formatTani(remainingWei)} TNC.`);
      return;
    }
    if (amt > tokenInfo.balance) {
      setFormError(`Saldo TNC Anda hanya ${formatTani(tokenInfo.balance)} TNC. Klaim TNC testnet dari faucet terlebih dahulu.`);
      return;
    }
    setFormError(null);
    try {
      await execTx({ address: TOKEN_ADDRESS, abi: abi.token, functionName: "approve", args: [FUNDING_ADDRESS, amt] });
      await refreshAllowance();
    } catch {}
  }
  async function handleContribute() {
    const amt = amountWei;
    if (!amt) {
      setFormError("Masukkan jumlah TNC yang valid (lebih dari 0).");
      return;
    }
    if (amt > remainingWei) {
      setFormError(`Jumlah melebihi sisa target. Maksimal ${formatTani(remainingWei)} TNC.`);
      return;
    }
    if (amt > tokenInfo.balance) {
      setFormError(`Saldo TNC Anda hanya ${formatTani(tokenInfo.balance)} TNC. Klaim TNC testnet dari faucet terlebih dahulu.`);
      return;
    }
    setFormError(null);
    try {
      await execTx({ address: FUNDING_ADDRESS, abi: abi.funding, functionName: "contribute", args: [id, amt] });
      setAmount("");
      refetch();
      refreshAllowance();
    } catch {}
  }

  const needed = amountWei ?? 0n;
  const needApprove = needed > 0n && allowance < needed;

  return (
    <>
      <Navigation />
      <main className="page">
        <div className="eyebrow">Campaign #{String(id)}</div>
        <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
          <h1 style={{ margin: 0 }}>{campaign.title}</h1>
          <StatusBadge status={campaign.status} deadlinePassed={deadlinePassed} />
        </div>
        <p style={{ color: "var(--muted)" }}>{campaign.crop} · {campaign.location}</p>
        <div className="meter"><span style={{ width: `${Math.min(100, targetNum > 0 ? (raisedNum / targetNum) * 100 : 0)}%` }} /></div>
        <p><strong>{formatTani(campaign.totalRaised)} TNC</strong> dari target {formatTani(campaign.targetAmount)} TNC · Escrow tersedia {formatTani(escrow)} TNC</p>
        <p>Berakhir: {formatDate(campaign.fundingDeadline)}{countdownText ? ` · ${countdownText}` : ""}</p>
        <p>Petani: {formatAddress(campaign.farmer)}</p>
        <p>Rencana: {campaign.plan}</p>

        <ShareCampaignCard url={shareUrl} title={campaign.title} />

        {error ? <ErrorMessage error={error} onRetry={reset} /> : null}
        <TransactionStatus status={status} txHash={txHash ?? undefined} explorerUrl={EXPLORER_URL} />
        {actions.error ? <ErrorMessage error={actions.error} onRetry={actions.reset} /> : null}
        <TransactionStatus status={actions.status} txHash={actions.txHash ?? undefined} explorerUrl={EXPLORER_URL} />

        {/* Kontributor: hanya saat pendanaan masih dibuka */}
        {isConnected && campaign.status === CampaignStatus.FUNDING && !deadlinePassed ? (
          <section style={{ marginTop: 24 }}>
            <h3>Kontribusi</h3>
            {remainingWei === 0n ? (
              <p>Target sudah tercapai. Campaign ini tidak menerima kontribusi lagi.</p>
            ) : (
              <>
                <p style={{ color: "var(--muted)" }}>
                  Sisa target: <strong>{formatTani(remainingWei)} TNC</strong>. Kontribusi melebihi sisa target akan ditolak kontrak.
                </p>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
                  <input
                    type="number"
                    placeholder="Jumlah TNC"
                    value={amount}
                    onChange={(e) => {
                      setAmount(e.target.value);
                      setFormError(null);
                    }}
                    min="0"
                    max={Number(remainingWei) / 1e18}
                    step="0.0001"
                    aria-invalid={overLimit}
                  />
                  {needApprove ? (
                    <button type="button" className="button secondary" onClick={handleApprove} disabled={!isMonad || status === "pending" || status === "awaiting-wallet" || overLimit || insufficientBalance}>Approve</button>
                  ) : null}
                  <button type="button" className="button" onClick={handleContribute} disabled={!isMonad || status === "pending" || status === "awaiting-wallet" || needApprove || overLimit || insufficientBalance}>Kontribusi</button>
                </div>
                {overLimit ? (
                  <p style={{ color: "var(--danger)" }}>Jumlah melebihi sisa target. Maksimal {formatTani(remainingWei)} TNC.</p>
                ) : insufficientBalance ? (
                  <p style={{ color: "var(--danger)" }}>
                    Saldo Anda {formatTani(tokenInfo.balance)} TNC, kurang dari jumlah yang dipilih. <Link href="/faucet" style={{ textDecoration: "underline", fontWeight: 700 }}>Klaim TNC testnet di faucet</Link>.
                  </p>
                ) : formError ? (
                  <p style={{ color: "var(--danger)" }}>{formError}</p>
                ) : null}
                <small>Saldo Anda: {formatTani(tokenInfo.balance)} TNC · Kontribusi Anda: {formatTani(contribWei)} TNC</small>
              </>
            )}
          </section>
        ) : null}

        {isConnected && address === campaign.farmer && campaign.status === CampaignStatus.ACTIVE ? (
          <section style={{ marginTop: 24 }}>
            <h3>Aksi petani</h3>
            <button type="button" className="button secondary" onClick={() => actions.completeCampaign(id)} disabled={actions.status === "pending" || actions.status === "awaiting-wallet"}>Selesaikan campaign</button>
          </section>
        ) : null}

        {isConnected && campaign.status === CampaignStatus.FAILED ? (
          <section style={{ marginTop: 24 }}>
            <h3>Refund</h3>
            {contribWei > 0n ? (
              <button type="button" className="button" onClick={() => actions.claimRefund(id)} disabled={actions.status === "pending" || actions.status === "awaiting-wallet"}>Klaim refund</button>
            ) : (
              <p>Anda tidak memiliki kontribusi pada campaign ini.</p>
            )}
          </section>
        ) : null}

        {campaign.status === CampaignStatus.FUNDING && deadlinePassed ? (
          <section style={{ marginTop: 24 }}>
            <h3>Pendanaan ditutup</h3>
            <p>
              Batas waktu pendanaan sudah lewat. Di blockchain status campaign masih <strong>FUNDING</strong> sampai ada yang memanggil
              finalisasi, jadi dana tidak bisa bertambah dan campaign ini menunggu langkah finalisasi.
            </p>
            {targetReached ? (
              <p>Target sudah tercapai ({formatTani(campaign.totalRaised)} TNC). Finalisasi akan mengaktifkan pendanaan dan membuka pengajuan pencairan.</p>
            ) : (
              <p>Target belum tercapai (terkumpul {formatTani(campaign.totalRaised)} TNC dari {formatTani(campaign.targetAmount)} TNC). Finalisasi akan menandai campaign gagal dan membuka refund bagi kontributor.</p>
            )}
            {isConnected ? (
              <button type="button" className="button" onClick={() => actions.finalizeCampaign(id)} disabled={actions.status === "pending" || actions.status === "awaiting-wallet"}>
                {targetReached ? "Aktifkan pendanaan" : "Finalisasi & tandai gagal"}
              </button>
            ) : (
              <p>Finalisasi bisa dilakukan siapa saja, bukan hanya petani. Hubungkan wallet untuk melanjutkan.</p>
            )}
          </section>
        ) : null}

        <section style={{ marginTop: 24 }}>
          <h3>Pengajuan pencairan</h3>
          {requests.length === 0 ? <EmptyState title="Belum ada pengajuan" /> : (
            <ul style={{ listStyle: "none", padding: 0, display: "grid", gap: 10 }}>
              {requests.map((r) => (
                <li key={String(r.id)} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap", padding: 14, border: "1px solid var(--line)", borderRadius: 12 }}>
                  <div>
                    <Link href={`/campaigns/${id}/requests/${r.id}`}>Request #{String(r.id)} · {formatTani(r.amount)} TNC · {r.purpose}</Link>
                    <div style={{ marginTop: 8, display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                      <StatusBadge status={r.status} domain="request" />
                      {r.status === RequestStatus.PENDING && now !== null && now < Number(r.votingDeadline) ? <span>Investor dapat memberi suara sampai {formatDate(r.votingDeadline)}.</span> : null}
                    </div>
                  </div>
                  <Link className="button secondary" href={`/campaigns/${id}/requests/${r.id}`}>
                    {r.status === RequestStatus.PENDING ? "Buka voting" : "Lihat detail"}
                  </Link>
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
