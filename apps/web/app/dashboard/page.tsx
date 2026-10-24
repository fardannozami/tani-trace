"use client";
import { useState } from "react";
import { Navigation } from "../../components/Navigation";
import { useWallet } from "../../hooks/useWallet";
import { usePublicClient } from "wagmi";
import { FUNDING_ADDRESS, abi, isConfigured, EXPLORER_URL } from "../../lib/contract";
import { useContractTx } from "../../hooks/useContractTx";
import { useCampaignActions } from "../../hooks/useCampaignActions";
import { useIPFS } from "../../hooks/useIPFS";
import { AdvisoryCard } from "../../components/campaign/AdvisoryCard";
import { StatusBadge } from "../../components/campaign/StatusBadge";
import { ErrorMessage } from "../../components/ui/ErrorMessage";
import { TransactionStatus } from "../../components/ui/TransactionStatus";
import { EmptyState } from "../../components/ui/EmptyState";
import { Skeleton } from "../../components/ui/Skeleton";
import { formatTani } from "../../lib/format";

import type { AdvisoryReportLike } from "../../components/campaign/AdvisoryCard";
import { MAX_UPLOAD_BYTES, MAX_BUNDLE_BYTES } from "../../hooks/useIPFS";
import { useQuery } from "@tanstack/react-query";

export default function Dashboard() {
  const { address, isConnected, isMonad } = useWallet();
  const publicClient = usePublicClient();
  const { status, error, reset } = useContractTx();
  const actions = useCampaignActions();
  const ipfs = useIPFS();

  const [selectedCampaign, setSelectedCampaign] = useState<string>("");
  const [amount, setAmount] = useState("");
  const [purpose, setPurpose] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [cid, setCid] = useState<string | null>(null);
  const [advisory, setAdvisory] = useState<AdvisoryReportLike | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const { data: campaigns, isLoading } = useQuery({
    queryKey: ["myCampaigns", address],
    enabled: !!publicClient && isConfigured && !!address,
    queryFn: async () => {
      const ids = (await publicClient!.readContract({ address: FUNDING_ADDRESS, abi: abi.funding, functionName: "getCampaignIds", args: [0n, 100n] })) as bigint[];
      type DashCampaign = { id: bigint; farmer?: string; title?: string; totalRaised: bigint; targetAmount: bigint; status: number };
      const out: DashCampaign[] = [];
      for (const id of ids) {
        const raw = await publicClient!.readContract({ address: FUNDING_ADDRESS, abi: abi.funding, functionName: "campaigns", args: [id] });
        const c = raw as { farmer?: string; title?: string; totalRaised?: bigint; targetAmount?: bigint; status?: number };
        if (c.farmer?.toLowerCase() === address?.toLowerCase()) {
          out.push({ id, farmer: c.farmer, title: c.title, totalRaised: c.totalRaised ?? 0n, targetAmount: c.targetAmount ?? 0n, status: c.status ?? 0 });
        }
      }
      return out;
    },
  });

  async function handleUpload() {
    setUploadError(null);
    if (files.length === 0) { setUploadError("Pilih berkas bukti."); return; }
    const total = files.reduce((a, f) => a + f.size, 0);
    if (total > MAX_BUNDLE_BYTES) { setUploadError("Bundle terlalu besar."); return; }
    for (const f of files) if (f.size > MAX_UPLOAD_BYTES) { setUploadError("File terlalu besar."); return; }
    setUploading(true);
    try {
      const res = await ipfs.uploadBundle(files, purpose);
      // upload manifest? We only have file cids; evidenceCid should be manifest cid. Use first file cid as evidenceCid fallback.
      const evidenceCid = res.fileCids[0] ?? "";
      setCid(evidenceCid);
      setAdvisory(res.advisory as unknown as AdvisoryReportLike | null);
    } catch (e) {
      setUploadError((e as { message?: string })?.message || "upload failed");
    } finally {
      setUploading(false);
    }
  }

  async function handleRequest() {
    if (!selectedCampaign || !cid || !amount) return;
    const amt = BigInt(Math.round(Number(amount) * 1e18));
    try {
      await actions.requestDisbursement(BigInt(selectedCampaign), amt, purpose, cid);
      setCid(null); setFiles([]); setAmount(""); setPurpose("");
    } catch {}
  }

  if (!isConfigured) return <><Navigation /><main className="page"><div className="notice">Kontrak belum dikonfigurasi.</div></main></>;
  if (!isConnected) return <><Navigation /><main className="page"><div className="notice">Hubungkan wallet untuk mengakses dashboard.</div></main></>;

  return (
    <>
      <Navigation />
      <main className="page">
        <div className="eyebrow">Workspace</div>
        <h1>Dashboard</h1>
        {isLoading ? <Skeleton lines={3} /> : null}
        {!isLoading && (!campaigns || campaigns.length === 0) ? <EmptyState title="Belum ada campaign milik Anda" action={{ label: "Buat campaign", href: "/campaigns/new" }} /> : null}
        {campaigns && campaigns.length > 0 ? (
          <section style={{ marginTop: 16 }}>
            <h3>Campaign Anda</h3>
            <ul>
              {campaigns.map((c) => (
                <li key={String(c.id)}>
                  <StatusBadge status={c.status} /> #{String(c.id)} {c.title} · {formatTani(c.totalRaised)} / {formatTani(c.targetAmount)} TNC
                  <button type="button" className="button secondary" style={{ marginLeft: 8 }} onClick={() => setSelectedCampaign(String(c.id))}>Pilih</button>
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        <section style={{ marginTop: 24 }}>
          <h3>Ajukan pencairan (dua langkah)</h3>
          <label>Campaign
            <select value={selectedCampaign} onChange={(e) => setSelectedCampaign(e.target.value)}>
              <option value="">Pilih campaign</option>
              {(campaigns ?? []).map((c) => <option key={String(c.id)} value={String(c.id)}>#{String(c.id)} {c.title}</option>)}
            </select>
          </label>
          <label>Nominal (TNC)<input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} min="0" step="0.0001" /></label>
          <label>Tujuan<input value={purpose} onChange={(e) => setPurpose(e.target.value)} /></label>
          <label>Berkas bukti<input type="file" multiple accept="image/jpeg,image/png,application/pdf,application/json" onChange={(e) => setFiles(Array.from(e.target.files ?? []))} /></label>
          <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
            <button type="button" className="button secondary" onClick={handleUpload} disabled={uploading || status === "pending"}>{uploading ? "Mengunggah..." : "1. Unggah bukti ke IPFS"}</button>
            <button type="button" className="button" onClick={handleRequest} disabled={!cid || !isMonad || status === "pending" || status === "awaiting-wallet"}>2. Ajukan pencairan</button>
          </div>
          {cid ? <p>CID bukti: {cid}</p> : null}
          {uploadError ? <ErrorMessage error={uploadError} /> : null}
          {error ? <ErrorMessage error={error} onRetry={reset} /> : null}
          <TransactionStatus status={status} explorerUrl={EXPLORER_URL} />
          <AdvisoryCard report={advisory} busy={uploading} />
        </section>
      </main>
    </>
  );
}
