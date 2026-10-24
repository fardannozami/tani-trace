"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Navigation } from "../../../components/Navigation";
import { useWallet } from "../../../hooks/useWallet";
import { useContractTx } from "../../../hooks/useContractTx";
import { parseEventLogs } from "viem";
import { FUNDING_ADDRESS, abi, isConfigured, EXPLORER_URL } from "../../../lib/contract";
import { ErrorMessage } from "../../../components/ui/ErrorMessage";
import { TransactionStatus } from "../../../components/ui/TransactionStatus";

const LIMITS = { title: 96, crop: 48, location: 120, plan: 600 };

export default function NewCampaign() {
  const router = useRouter();
  const { isConnected, isMonad } = useWallet();
  const { execute, status, error, txHash, reset } = useContractTx();
  const [title, setTitle] = useState("");
  const [crop, setCrop] = useState("");
  const [location, setLocation] = useState("");
  const [plan, setPlan] = useState("");
  const [target, setTarget] = useState("");
  const [deadline, setDeadline] = useState("");
  const [localError, setLocalError] = useState<string | null>(null);

  function validate() {
    if (!title.trim()) return "Judul wajib diisi.";
    if (title.length > LIMITS.title) return `Judul maksimal ${LIMITS.title} karakter.`;
    if (!crop.trim()) return "Jenis tanaman wajib diisi.";
    if (crop.length > LIMITS.crop) return `Jenis tanaman maksimal ${LIMITS.crop} karakter.`;
    if (!location.trim()) return "Lokasi wajib diisi.";
    if (location.length > LIMITS.location) return `Lokasi maksimal ${LIMITS.location} karakter.`;
    if (!plan.trim()) return "Rencana dana wajib diisi.";
    if (plan.length > LIMITS.plan) return `Rencana maksimal ${LIMITS.plan} karakter.`;
    const t = Number(target);
    if (!Number.isFinite(t) || t <= 0) return "Target harus lebih dari 0 TNC.";
    if (!deadline) return "Deadline wajib diisi.";
    const ts = Math.floor(new Date(deadline).getTime() / 1000);
    if (!Number.isFinite(ts) || ts <= Math.floor(Date.now() / 1000)) return "Deadline harus di masa depan.";
    return null;
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLocalError(null);
    const v = validate();
    if (v) { setLocalError(v); return; }
    if (!isConfigured) { setLocalError("Kontrak belum dikonfigurasi."); return; }
    const targetWei = BigInt(Math.round(Number(target) * 1e18));
    const ts = BigInt(Math.floor(new Date(deadline).getTime() / 1000));
    try {
      const receipt = await execute({
        address: FUNDING_ADDRESS,
        abi: abi.funding,
        functionName: "createCampaign",
        args: [title.trim(), crop.trim(), location.trim(), plan.trim(), targetWei, ts],
      });
      let newId: string | null = null;
      try {
        const logs = parseEventLogs({ abi: abi.funding, logs: receipt.logs }) as Array<{ eventName?: string; args?: { id?: unknown } }>;
        const ev = logs.find((l) => l.eventName === "CampaignCreated");
        if (ev && ev.args?.id !== undefined) newId = String(ev.args.id);
      } catch {}
      if (newId) router.push(`/campaigns/${newId}`);
      else router.push("/campaigns");
    } catch {
      // error in status
    }
  }

  return (
    <>
      <Navigation />
      <main className="page">
        <div className="eyebrow">Mulai musim baru</div>
        <div className="page-title-row"><div><h1>Bawa cerita panenmu<br /><em>ke komunitas.</em></h1><p className="lead page-lead">Jelaskan kebutuhan modal dengan sederhana. Investor akan melihat target, rencana, dan batas waktunya secara transparan.</p></div><span className="workspace-mark">01</span></div>
        {!isConfigured ? <div className="notice">Kontrak belum dikonfigurasi.</div> : null}
        {localError ? <ErrorMessage error={localError} /> : null}
        {error ? <ErrorMessage error={error} onRetry={reset} /> : null}
        <TransactionStatus status={status} txHash={txHash ?? undefined} explorerUrl={EXPLORER_URL} />
        <form onSubmit={onSubmit} className="form-shell campaign-form">
          <label>Judul<input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={LIMITS.title} required /></label>
          <label>Jenis tanaman<input value={crop} onChange={(e) => setCrop(e.target.value)} maxLength={LIMITS.crop} required /></label>
          <label>Lokasi<input value={location} onChange={(e) => setLocation(e.target.value)} maxLength={LIMITS.location} required /></label>
          <label>Rencana dana<textarea value={plan} onChange={(e) => setPlan(e.target.value)} maxLength={LIMITS.plan} rows={5} required /></label>
          <label>Target (TNC)<input type="number" value={target} onChange={(e) => setTarget(e.target.value)} min="0" step="0.0001" required /></label>
          <label>Deadline<input type="datetime-local" value={deadline} onChange={(e) => setDeadline(e.target.value)} required /></label>
          <button type="submit" className="button" disabled={!isConnected || !isMonad || status === "pending" || status === "awaiting-wallet"}>Buat campaign</button>
          {!isConnected ? <small>Hubungkan wallet terlebih dahulu.</small> : null}
        </form>
      </main>
    </>
  );
}
