"use client";

import { Navigation } from "../../components/Navigation";
import { useWallet } from "../../hooks/useWallet";
import { usePublicClient } from "wagmi";
import { decodeCampaign } from "../../lib/decode";
import { FUNDING_ADDRESS, abi, isConfigured, EXPLORER_URL } from "../../lib/contract";
import { useContractTx } from "../../hooks/useContractTx";
import { useCampaignActions } from "../../hooks/useCampaignActions";
import { CampaignStatus } from "../../lib/types";
import { formatTani } from "../../lib/format";
import { EmptyState } from "../../components/ui/EmptyState";
import { Skeleton } from "../../components/ui/Skeleton";
import { ErrorMessage } from "../../components/ui/ErrorMessage";
import { TransactionStatus } from "../../components/ui/TransactionStatus";
import { useQuery } from "@tanstack/react-query";

export default function Refund() {
  const { address, isConnected, isMonad } = useWallet();
  const publicClient = usePublicClient();
  const { status, error, reset } = useContractTx();
  const actions = useCampaignActions();

  const { data, isLoading } = useQuery({
    queryKey: ["refundList", address],
    enabled: !!publicClient && isConfigured && !!address,
    queryFn: async () => {
      const ids = (await publicClient!.readContract({ address: FUNDING_ADDRESS, abi: abi.funding, functionName: "getCampaignIds", args: [0n, 100n] })) as bigint[];
      type RefundRow = { id: bigint; title: string; contrib: bigint; farmer: `0x${string}` };
      const out: RefundRow[] = [];
      for (const id of ids) {
        const raw = await publicClient!.readContract({ address: FUNDING_ADDRESS, abi: abi.funding, functionName: "campaigns", args: [id] });
        const c = decodeCampaign(id, raw as readonly unknown[]);
        if (c.status !== CampaignStatus.FAILED) continue;
        const contrib = (await publicClient!.readContract({ address: FUNDING_ADDRESS, abi: abi.funding, functionName: "contributionOf", args: [id, address!] })) as bigint;
        if (contrib <= 0n) continue;
        const refunded = (await publicClient!.readContract({ address: FUNDING_ADDRESS, abi: abi.funding, functionName: "refunded", args: [id, address!] })) as boolean;
        if (refunded) continue;
        out.push({ id, title: c.title, contrib, farmer: c.farmer });
      }
      return out;
    },
  });

  if (!isConfigured) return <><Navigation /><main className="page"><div className="notice">Kontrak belum dikonfigurasi.</div></main></>;
  if (!isConnected) return <><Navigation /><main className="page"><div className="notice">Hubungkan wallet.</div></main></>;

  return (
    <>
      <Navigation />
      <main className="page">
        <div className="eyebrow">Safety rail</div>
        <h1>Refund</h1>
        {isLoading ? <Skeleton lines={3} /> : null}
        {error ? <ErrorMessage error={error} onRetry={reset} /> : null}
        <TransactionStatus status={status} explorerUrl={EXPLORER_URL} />
        {!isLoading && (!data || data.length === 0) ? <EmptyState title="Tidak ada refund tersedia" description="Anda tidak memiliki kontribusi pada campaign gagal yang belum diklaim." /> : null}
        <ul style={{ listStyle: "none", padding: 0, display: "flex", flexDirection: "column", gap: 8, marginTop: 16 }}>
          {(data ?? []).map((c) => (
            <li key={String(c.id)} style={{ padding: 12, border: "1px solid var(--line)", borderRadius: 12, background: "var(--card)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <strong>#{String(c.id)} {c.title}</strong>
                <div style={{ fontSize: 13, color: "var(--muted)" }}>Kontribusi: {formatTani(c.contrib)} TNC</div>
              </div>
              <button type="button" className="button" onClick={() => actions.claimRefund(c.id)} disabled={!isMonad || status === "pending" || status === "awaiting-wallet"}>Klaim refund</button>
            </li>
          ))}
        </ul>
      </main>
    </>
  );
}
