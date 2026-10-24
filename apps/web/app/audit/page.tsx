"use client";
import { useState } from "react";
import { Navigation } from "../../components/Navigation";
import { useAuditFeed } from "../../hooks/useAuditFeed";
import { abi } from "../../lib/contract";
import { decodeEventLog } from "viem";
import { getAuditEventMeta, type AuditEventGroup } from "../../lib/eventParser";
import { EXPLORER_URL } from "../../lib/contract";
import { EmptyState } from "../../components/ui/EmptyState";
import { Skeleton } from "../../components/ui/Skeleton";
import { ErrorMessage } from "../../components/ui/ErrorMessage";

const GROUPS: { label: string; value: AuditEventGroup | "all" }[] = [
  { label: "Semua", value: "all" },
  { label: "Campaign", value: "campaign" },
  { label: "Pendanaan", value: "funding" },
  { label: "Pencairan", value: "disbursement" },
  { label: "Voting", value: "vote" },
  { label: "Refund", value: "refund" },
  { label: "Siklus", value: "lifecycle" },
];

export default function Audit() {
  const { data: logs, isLoading, error, refetch } = useAuditFeed();
  const [group, setGroup] = useState<AuditEventGroup | "all">("all");
  const [limit, setLimit] = useState(20);

  // Decode using abi
  const decoded = (logs ?? []).map((l) => {
    const log = l as { data: `0x${string}`; topics: readonly `0x${string}`[]; blockNumber?: bigint | null; transactionHash?: `0x${string}` | null; address?: string };
    try {
      const d = decodeEventLog({ abi: abi.funding, data: log.data, topics: log.topics as [`0x${string}`, ...`0x${string}`[]] });
      return { ...log, eventName: d.eventName, args: d.args };
    } catch {
      return { ...log, eventName: "Unknown", args: {} };
    }
  }).filter((l) => {
    if (group === "all") return true;
    const meta = getAuditEventMeta(String(l.eventName));
    return meta?.group === group;
  });

  const shown = decoded.slice(0, limit);

  return (
    <>
      <Navigation />
      <main className="page">
        <div className="eyebrow">Public ledger</div>
        <h1>Audit feed</h1>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 12 }}>
          {GROUPS.map((g) => (
            <button key={g.value} type="button" className={group === g.value ? "button" : "button secondary"} onClick={() => setGroup(g.value)}>{g.label}</button>
          ))}
        </div>
        {isLoading ? <Skeleton lines={4} /> : null}
        {error ? <ErrorMessage error={error as Error} onRetry={() => refetch()} /> : null}
        {!isLoading && decoded.length === 0 ? <EmptyState title="Belum ada event" /> : null}
        <ul style={{ marginTop: 16, listStyle: "none", padding: 0, display: "flex", flexDirection: "column", gap: 8 }}>
          {shown.map((l, i: number) => {
            const meta = getAuditEventMeta(String(l.eventName));
            return (
              <li key={i} style={{ padding: 12, border: "1px solid var(--line)", borderRadius: 12, background: "var(--card)" }}>
                <strong>{meta?.label ?? l.eventName}</strong>
                <div style={{ fontSize: 13, color: "var(--muted)" }}>Blok {String(l.blockNumber)} · Tx <a href={`${EXPLORER_URL}/tx/${l.transactionHash}`} target="_blank" rel="noopener noreferrer">{String(l.transactionHash).slice(0, 10)}…</a></div>
              </li>
            );
          })}
        </ul>
        {shown.length < decoded.length ? (
          <button type="button" className="button secondary" style={{ marginTop: 12 }} onClick={() => setLimit(limit + 20)}>Muat lebih banyak</button>
        ) : null}
      </main>
    </>
  );
}
