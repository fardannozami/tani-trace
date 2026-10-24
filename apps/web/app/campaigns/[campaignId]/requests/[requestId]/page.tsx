"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { Navigation } from "../../../../../components/Navigation";
import { useWallet } from "../../../../../hooks/useWallet";
import { useCampaign } from "../../../../../hooks/useCampaign";
import { useVote } from "../../../../../hooks/useCampaign";
import { useCampaignActions } from "../../../../../hooks/useCampaignActions";
import { useNowSeconds } from "../../../../../hooks/useNowSeconds";
import { usePublicClient } from "wagmi";
import { FUNDING_ADDRESS, abi, isConfigured, EXPLORER_URL } from "../../../../../lib/contract";
import { decodeRequest } from "../../../../../lib/decode";
import { formatTani, formatDate } from "../../../../../lib/format";
import { quorumRequired, totalVoted, type Request } from "../../../../../lib/types";
import { verifyManifestHash, type EvidenceManifest } from "../../../../../lib/manifest";
import { StatusBadge } from "../../../../../components/campaign/StatusBadge";
import { ErrorMessage } from "../../../../../components/ui/ErrorMessage";
import { TransactionStatus } from "../../../../../components/ui/TransactionStatus";


export default function RequestDetail() {
  const params = useParams();
  const campaignId = BigInt(String(params?.campaignId ?? "0"));
  const requestId = BigInt(String(params?.requestId ?? "0"));
  const { address, isConnected, isMonad } = useWallet();
  const { campaign, contribution, isLoading: campaignLoading } = useCampaign(campaignId);
  const publicClient = usePublicClient();
  const queryClient = useQueryClient();
  const [request, setRequest] = useState<Request | null>(null);
  const [loaded, setLoaded] = useState(false);
  const { data: voted } = useVote(requestId, address);
  const actions = useCampaignActions();
  const now = useNowSeconds();
  const paymentExpiry = request ? Number(request.votingDeadline) + 7 * 24 * 60 * 60 : 0;

  useEffect(() => {
    if (!publicClient) return;
    let cancelled = false;
    publicClient
      .readContract({ address: FUNDING_ADDRESS, abi: abi.funding, functionName: "requests", args: [requestId] })
      .then((raw) => {
        if (!cancelled) setRequest(decodeRequest(requestId, raw as readonly unknown[]));
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setLoaded(true);
      });
    return () => { cancelled = true; };
  }, [publicClient, requestId]);

  useEffect(() => {
    if (actions.status !== "success") return;
    void queryClient.invalidateQueries({ queryKey: ["voted", String(requestId), address] });
    void queryClient.invalidateQueries({ queryKey: ["pendingVotes"] });
    if (!publicClient) return;
    let cancelled = false;
    publicClient
      .readContract({ address: FUNDING_ADDRESS, abi: abi.funding, functionName: "requests", args: [requestId] })
      .then((raw) => {
        if (!cancelled) setRequest(decodeRequest(requestId, raw as readonly unknown[]));
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [actions.status, publicClient, queryClient, requestId, address]);

  if (!isConfigured) return <><Navigation /><main className="page"><div className="notice">Kontrak belum dikonfigurasi.</div></main></>;
  if (!loaded || !request) return <><Navigation /><main className="page"><p>Memuat...</p></main></>;

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
  const eligibleVoter = isConnected && !campaignLoading && contribution > 0n;

  const ipfsGateway = process.env.NEXT_PUBLIC_IPFS_GATEWAY || "https://ipfs.io/ipfs/";
  const evidenceUrl = `${ipfsGateway}${request.evidenceCid}`;

  return (
    <>
      <Navigation />
      <main className="page">
        <div className="eyebrow">Campaign #{String(campaignId)} · Request #{String(requestId)}</div>
        <h1>Request pencairan</h1>
        <p>Jumlah: {formatTani(request.amount)} TNC · Tujuan: {request.purpose}</p>
        <p>Status pengajuan: <StatusBadge status={request.status} domain="request" /></p>
        {request.status === 0 ? <p style={{ color: "var(--muted)" }}>Status akan tetap “Menunggu voting” sampai periode voting berakhir dan pengajuan difinalisasi. Suara investor tercermin langsung pada bobot YA/TIDAK di bawah.</p> : null}
        <p>Voting berakhir: {formatDate(request.votingDeadline)}{now !== null ? ` ${now < Number(request.votingDeadline) ? `(${Number(request.votingDeadline)-now}s lagi)` : "(selesai)"}` : ""}</p>
        <p>Bobot YES: {formatTani(request.yesWeight)} · NO: {formatTani(request.noWeight)} · Total: {formatTani(total)} · Quorum: {formatTani(qr)}</p>
        <p>Manifest hash: {hashMatch ? "✓ cocok" : "✗ tidak cocok"}</p>
        <p>Bukti: <a href={evidenceUrl} target="_blank" rel="noopener noreferrer">{request.evidenceCid}</a></p>

        {actions.error ? <ErrorMessage error={actions.error} onRetry={actions.reset} /> : null}
        <TransactionStatus status={actions.status} txHash={actions.txHash ?? undefined} explorerUrl={EXPLORER_URL} />

        {request.status === 0 && now !== null && now < Number(request.votingDeadline) ? (
          <section style={{ marginTop: 18, padding: 16, border: "1px solid var(--line)", borderRadius: 12, background: "var(--mint)" }}>
            <strong>Voting investor sedang dibuka</strong>
            <p style={{ marginBottom: 0 }}>
              {!isConnected
                ? "Hubungkan wallet investor yang berkontribusi pada campaign ini untuk memberikan suara."
                : campaignLoading
                  ? "Memeriksa kontribusi wallet Anda…"
                  : contribution > 0n
                    ? `Bobot suara Anda ${formatTani(contribution)} TNC, sesuai total investasi Anda di campaign ini. Anda dapat memilih satu kali: YA atau TIDAK.`
                    : "Wallet ini belum berinvestasi pada campaign ini. Hanya investor campaign ini yang dapat memberikan suara."}
            </p>
          </section>
        ) : null}

        {eligibleVoter && now !== null && !voted && request.status === 0 && now < Number(request.votingDeadline) ? (
          <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
            <button type="button" className="button" onClick={() => actions.vote(requestId, true)} disabled={!isMonad || actions.status === "pending" || actions.status === "awaiting-wallet"}>Vote YA</button>
            <button type="button" className="button secondary" onClick={() => actions.vote(requestId, false)} disabled={!isMonad || actions.status === "pending" || actions.status === "awaiting-wallet"}>Vote TIDAK</button>
          </div>
        ) : null}
        {voted ? <p role="status">Suara Anda sudah tercatat dengan bobot {formatTani(contribution)} TNC. Status pengajuan tetap menunggu voting sampai periode selesai.</p> : null}

        {now !== null && now >= Number(request.votingDeadline) && request.status === 0 ? (
          <button type="button" className="button secondary" style={{ marginTop: 16 }} onClick={() => actions.finalizeRequest(requestId)} disabled={!isMonad || actions.status === "pending" || actions.status === "awaiting-wallet"}>Finalisasi pengajuan</button>
        ) : null}

        {request.status === 1 && isConnected && address === request.farmer ? (
          <button type="button" className="button" style={{ marginTop: 16 }} onClick={() => actions.payDisbursement(requestId)} disabled={!isMonad || actions.status === "pending" || actions.status === "awaiting-wallet"}>Bayar pencairan</button>
        ) : null}
        {request.status === 1 && now !== null && now > paymentExpiry ? (
          <button type="button" className="button secondary" style={{ marginTop: 16 }} onClick={() => actions.expireApprovedDisbursement(requestId)} disabled={!isMonad || actions.status === "pending" || actions.status === "awaiting-wallet"}>Batalkan pencairan yang kedaluwarsa</button>
        ) : null}
      </main>
    </>
  );
}
