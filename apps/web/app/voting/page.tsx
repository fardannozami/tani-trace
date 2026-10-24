"use client";
import Link from "next/link";
import { Navigation } from "../../components/Navigation";
import { StatusBadge } from "../../components/campaign/StatusBadge";
import { EmptyState } from "../../components/ui/EmptyState";
import { ErrorMessage } from "../../components/ui/ErrorMessage";
import { Skeleton } from "../../components/ui/Skeleton";
import { useNowSeconds } from "../../hooks/useNowSeconds";
import { usePendingVotes } from "../../hooks/usePendingVotes";
import { formatDate, formatTani } from "../../lib/format";
import { isConfigured } from "../../lib/contract";
import { quorumRequired, totalVoted } from "../../lib/types";

export default function VotingPage() {
  const { votes, isLoading, error, refetch } = usePendingVotes();
  const now = useNowSeconds();

  return (
    <>
      <Navigation />
      <main className="page">
        <div className="eyebrow">Partisipasi investor</div>
        <h1>Voting pengajuan pencairan</h1>
        <p>Periksa bukti dan berikan suara pada pengajuan yang masih membuka voting. Bobot suara mengikuti kontribusi Anda di campaign.</p>
        {!isConfigured ? <div className="notice">Kontrak belum dikonfigurasi.</div> : null}
        {isLoading ? <Skeleton showProgress lines={3} /> : null}
        {error ? <ErrorMessage error={error as Error} onRetry={() => refetch()} /> : null}
        {!isLoading && !error && votes.length === 0 ? (
          <EmptyState title="Tidak ada voting yang sedang dibuka" description="Pengajuan baru akan muncul di sini setelah petani mengajukan pencairan." />
        ) : null}
        {votes.length > 0 ? (
          <ul style={{ listStyle: "none", padding: 0, display: "grid", gap: 12, marginTop: 20 }}>
            {votes.map(({ campaignId, campaignTitle, campaignTotalRaised, request, userVoted }) => {
              const total = totalVoted(request);
              return (
                <li key={String(request.id)} style={{ padding: 18, border: "1px solid var(--line)", borderRadius: 14, background: "var(--card)" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
                    <strong>{campaignTitle} · Request #{String(request.id)}</strong>
                    <StatusBadge status={request.status} domain="request" />
                  </div>
                  <p style={{ marginBottom: 6 }}>{formatTani(request.amount)} TNC · {request.purpose}</p>
                  <p style={{ color: "var(--muted)", marginTop: 0 }}>
                    Voting berakhir {formatDate(request.votingDeadline)}
                    {now !== null ? ` · ${Math.max(0, Number(request.votingDeadline) - now)} detik tersisa` : ""}
                  </p>
                  <p style={{ color: "var(--muted)" }}>
                    Suara YA: {formatTani(request.yesWeight)} · TIDAK: {formatTani(request.noWeight)} ·
                    {" "}total: {formatTani(total)} / quorum {formatTani(quorumRequired(campaignTotalRaised))} TNC
                  </p>
                  {userVoted ? <p role="status">Suara Anda sudah tercatat. Pengajuan tetap menunggu voting hingga periode berakhir.</p> : null}
                  <Link className="button" href={`/campaigns/${campaignId}/requests/${request.id}`}>{userVoted ? "Lihat hasil voting" : "Lihat bukti & beri suara"}</Link>
                </li>
              );
            })}
          </ul>
        ) : null}
      </main>
    </>
  );
}
