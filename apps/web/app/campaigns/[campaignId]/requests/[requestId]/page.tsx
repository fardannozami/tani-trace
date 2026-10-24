"use client";
import { useState } from "react";
import { useParams } from "next/navigation";
import { Navigation } from "../../../../../components/Navigation";
import { useWallet } from "../../../../../hooks/useWallet";
import { useCampaign } from "../../../../../hooks/useCampaign";
import { useVote } from "../../../../../hooks/useCampaign";
import { useContractTx } from "../../../../../hooks/useContractTx";
import { useCampaignActions } from "../../../../../hooks/useCampaignActions";
import { useNowSeconds } from "../../../../../hooks/useNowSeconds";
import { usePublicClient } from "wagmi";
import { FUNDING_ADDRESS, abi, isConfigured, EXPLORER_URL } from "../../../../../lib/contract";
import { formatTani, formatDate } from "../../../../../lib/format";
import { quorumRequired, totalVoted } from "../../../../../lib/types";
import { verifyManifestHash, type EvidenceManifest } from "../../../../../lib/manifest";
import { StatusBadge } from "../../../../../components/campaign/StatusBadge";
import { ErrorMessage } from "../../../../../components/ui/ErrorMessage";
import { TransactionStatus } from "../../../../../components/ui/TransactionStatus";


export default function RequestDetail() {
  const params = useParams();
  const campaignId = BigInt(String(params?.campaignId ?? "0"));
  const requestId = BigInt(String(params?.requestId ?? "0"));
  const { address, isConnected, isMonad } = useWallet();
  const { campaign } = useCampaign(campaignId);
  const publicClient = usePublicClient();
  const [req, setReq] = useState<Record<string, unknown> | null>(null);
  const [loaded, setLoaded] = useState(false);
  const { data: voted } = useVote(requestId, address);
  const { status, error, reset } = useContractTx();
  const actions = useCampaignActions();
  const now = useNowSeconds();

  // load request
  async function load() {
    if (!publicClient) return;
    try {
      const raw = await publicClient.readContract({ address: FUNDING_ADDRESS, abi: abi.funding, functionName: "requests", args: [requestId] });
      setReq(raw as Record<string, unknown>);
    } catch {}
    setLoaded(true);
  }
  if (!loaded) load();

  if (!isConfigured) return <><Navigation /><main className="page"><div className="notice">Kontrak belum dikonfigurasi.</div></main></>;
  if (!loaded || !req) return <><Navigation /><main className="page"><p>Memuat...</p></main></>;

  const request = {
    id: requestId,
    campaignId: req.campaignId as bigint,
    farmer: req.farmer as `0x${string}`,
    amount: req.amount as bigint,
    purpose: req.purpose as string,
    evidenceCid: req.evidenceCid as string,
    manifestHash: req.manifestHash as `0x${string}`,
    requestedAt: req.requestedAt as bigint,
    votingDeadline: req.votingDeadline as bigint,
    yesWeight: req.yesWeight as bigint,
    noWeight: req.noWeight as bigint,
    status: req.status as number,
  };

  const manifest: EvidenceManifest = {
    campaignId: request.campaignId,
    requestId: request.id,
    farmer: request.farmer,
    amount: request.amount.toString(),
    purpose: request.purpose,
    evidenceCid: request.evidenceCid,
    requestedAt: request.requestedAt,
  };
  const hashMatch = verifyManifestHash(manifest, request.manifestHash);
  const qr = quorumRequired(campaign?.totalRaised ?? 0n);
  const total = totalVoted(request);

  const ipfsGateway = process.env.NEXT_PUBLIC_IPFS_GATEWAY || "https://ipfs.io/ipfs/";
  const evidenceUrl = `${ipfsGateway}${request.evidenceCid}`;

  return (
    <>
      <Navigation />
      <main className="page">
        <div className="eyebrow">Campaign #{String(campaignId)} · Request #{String(requestId)}</div>
        <h1>Request pencairan</h1>
        <p>Jumlah: {formatTani(request.amount)} TNC · Tujuan: {request.purpose}</p>
        <p>Status: <StatusBadge status={request.status} domain="request" /></p>
        <p>Voting berakhir: {formatDate(request.votingDeadline)} {now < Number(request.votingDeadline) ? `(${Number(request.votingDeadline)-now}s lagi)` : "(selesai)"}</p>
        <p>Bobot YES: {formatTani(request.yesWeight)} · NO: {formatTani(request.noWeight)} · Total: {formatTani(total)} · Quorum: {formatTani(qr)}</p>
        <p>Manifest hash: {hashMatch ? "✓ cocok" : "✗ tidak cocok"}</p>
        <p>Bukti: <a href={evidenceUrl} target="_blank" rel="noopener noreferrer">{request.evidenceCid}</a></p>

        {error ? <ErrorMessage error={error} onRetry={reset} /> : null}
        <TransactionStatus status={status} explorerUrl={EXPLORER_URL} />

        {isConnected && !voted && request.status === 0 && now < Number(request.votingDeadline) ? (
          <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
            <button type="button" className="button" onClick={() => actions.vote(requestId, true)} disabled={!isMonad || status === "pending" || status === "awaiting-wallet"}>Vote YA</button>
            <button type="button" className="button secondary" onClick={() => actions.vote(requestId, false)} disabled={!isMonad || status === "pending" || status === "awaiting-wallet"}>Vote TIDAK</button>
          </div>
        ) : null}
        {voted ? <p>Anda sudah memberikan suara.</p> : null}

        {now >= Number(request.votingDeadline) && request.status === 0 ? (
          <button type="button" className="button secondary" style={{ marginTop: 16 }} onClick={() => actions.finalizeRequest(requestId)} disabled={!isMonad || status === "pending" || status === "awaiting-wallet"}>Finalisasi pengajuan</button>
        ) : null}

        {request.status === 1 && isConnected && address === request.farmer ? (
          <button type="button" className="button" style={{ marginTop: 16 }} onClick={() => actions.payDisbursement(requestId)} disabled={!isMonad || status === "pending" || status === "awaiting-wallet"}>Bayar pencairan</button>
        ) : null}
      </main>
    </>
  );
}
