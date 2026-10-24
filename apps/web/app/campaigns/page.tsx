"use client";
import Link from "next/link";
import { useState } from "react";
import { Navigation } from "../../components/Navigation";
import { usePublicClient } from "wagmi";
import { useNowSeconds } from "../../hooks/useNowSeconds";
import { FUNDING_ADDRESS, abi, isConfigured } from "../../lib/contract";
import { decodeCampaign } from "../../lib/decode";
import { CampaignStatus } from "../../lib/types";
import { formatTani, formatDate, formatAddress } from "../../lib/format";
import { CampaignCard } from "../../components/campaign/CampaignCard";
import { EmptyState } from "../../components/ui/EmptyState";
import { Skeleton } from "../../components/ui/Skeleton";
import { ErrorMessage } from "../../components/ui/ErrorMessage";
import { useQuery } from "@tanstack/react-query";

const PAGE_SIZE = 100;

export default function Campaigns() {
  const publicClient = usePublicClient();
  const [offset, setOffset] = useState(0);
  const [statusFilter, setStatusFilter] = useState<CampaignStatus | undefined>(undefined);
  const now = useNowSeconds();

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["campaignsPage", offset, statusFilter],
    enabled: !!publicClient && isConfigured,
    queryFn: async () => {
      const ids = (await publicClient!.readContract({
        address: FUNDING_ADDRESS,
        abi: abi.funding,
        functionName: "getCampaignIds",
        args: [BigInt(offset), BigInt(PAGE_SIZE)],
      })) as bigint[];
      const mapped = await Promise.all(
        ids.map(async (id) => {
          const raw = await publicClient!.readContract({
            address: FUNDING_ADDRESS,
            abi: abi.funding,
            functionName: "campaigns",
            args: [id],
          });
          return decodeCampaign(id, raw as readonly unknown[]);
        }),
      );
      if (statusFilter === undefined) return mapped;
      return mapped.filter((c) => c.status === statusFilter);
    },
  });

  const hasMore = (data?.length ?? 0) >= PAGE_SIZE || (data?.length ?? 0) > 0;

  return (
    <>
      <Navigation />
      <main className="page">
        <div className="page-intro">
          <div>
            <div className="eyebrow">Marketplace pendanaan</div>
            <h1>Tanam harapan,<br /><em>tumbuhkan dampak.</em></h1>
            <p className="lead page-lead">Pilih proyek pertanian yang ingin kamu dukung. Semua kontribusi, progres, dan keputusan pencairan dapat dilihat bersama.</p>
          </div>
          <div className="explore-stat"><span className="stat-icon">✦</span><strong>{data?.length ?? 0}</strong><span>proyek ditemukan</span></div>
        </div>
        {!isConfigured ? (
          <div className="notice">Kontrak belum dikonfigurasi. Isi .env.local dan deploy contract.</div>
        ) : null}
        <div className="filter-bar" role="group" aria-label="Filter status">
          {[
            { label: "Semua", value: undefined },
            { label: "Pendanaan", value: CampaignStatus.FUNDING },
            { label: "Aktif", value: CampaignStatus.ACTIVE },
            { label: "Gagal", value: CampaignStatus.FAILED },
            { label: "Selesai", value: CampaignStatus.COMPLETED },
          ].map((f) => (
            <button
              key={String(f.value)}
              type="button"
              className={statusFilter === f.value ? "button" : "button secondary"}
              aria-pressed={statusFilter === f.value}
              onClick={() => { setStatusFilter(f.value); setOffset(0); }}
            >
              {f.label}
            </button>
          ))}
        </div>
        <section className="grid campaign-grid">
          {isLoading ? (
            Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} showProgress />)
          ) : error ? (
            <ErrorMessage error={error as Error} onRetry={() => refetch()} />
          ) : !data || data.length === 0 ? (
            <EmptyState title="Tidak ada campaign" description="Belum ada campaign pada filter ini." />
          ) : (
            data.map((c) => (
              <Link key={String(c.id)} href={`/campaigns/${c.id}`} style={{ textDecoration: "none" }}>
                <CampaignCard
                  title={c.title}
                  crop={c.crop}
                  location={c.location}
                  targetLabel={`${formatTani(c.targetAmount)} TNC`}
                  raisedLabel={`${formatTani(c.totalRaised)} TNC`}
                  progress={c.targetAmount > 0n ? Number(c.totalRaised) / Number(c.targetAmount) : 0}
                  status={c.status}
                  deadlineLabel={formatDate(c.fundingDeadline)}
                  deadlinePassed={now !== null && now >= Number(c.fundingDeadline)}
                  farmerLabel={formatAddress(c.farmer)}
                />
              </Link>
            ))
          )}
        </section>
        {isConfigured ? (
          <div className="pagination-bar">
            <button type="button" className="button secondary" disabled={offset === 0} onClick={() => setOffset(Math.max(0, offset - PAGE_SIZE))}>Sebelumnya</button>
            <button type="button" className="button secondary" disabled={!hasMore || (data?.length ?? 0) < PAGE_SIZE} onClick={() => setOffset(offset + PAGE_SIZE)}>Berikutnya</button>
          </div>
        ) : null}
      </main>
    </>
  );
}
