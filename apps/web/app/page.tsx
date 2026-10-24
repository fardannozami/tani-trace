"use client";
import Link from "next/link";
import { Navigation } from "../components/Navigation";
import { useCampaigns } from "../hooks/useCampaigns";
import { isConfigured } from "../lib/contract";
import { formatTani, formatDate, formatAddress } from "../lib/format";

import { CampaignCard } from "../components/campaign/CampaignCard";

import { EmptyState } from "../components/ui/EmptyState";
import { Skeleton } from "../components/ui/Skeleton";
import { ErrorMessage } from "../components/ui/ErrorMessage";

export default function Home() {
  const { data: campaigns, isLoading, error, refetch } = useCampaigns();
  const latest = (campaigns ?? []).slice(0, 6);
  const totalRaised = (campaigns ?? []).reduce((a, c) => a + c.totalRaised, 0n);

  return (
    <>
      <Navigation />
      <main>
        <section className="hero">
          <div>
            <div className="eyebrow">Monad Testnet · TNC Protocol</div>
            <h1>Pendanaan tani yang bisa diaudit.</h1>
            <p className="lead">TaniTrace menghubungkan petani dan investor melalui campaign transparan. Kontribusi, bukti, voting, dan pencairan dicatat on-chain.</p>
            <div className="actions">
              <Link className="button" href="/campaigns">Lihat campaign</Link>
              <Link className="button secondary" href="/campaigns/new">Buat campaign</Link>
            </div>
            {isConfigured ? (
              <div style={{ marginTop: 24, display: "flex", gap: 16, flexWrap: "wrap" }}>
                <div className="card small"><div className="eyebrow">Total campaign</div><h3 style={{ margin: "8px 0" }}>{campaigns?.length ?? 0}</h3></div>
                <div className="card small"><div className="eyebrow">Total terkumpul</div><h3 style={{ margin: "8px 0" }}>{formatTani(totalRaised)} TNC</h3></div>
              </div>
            ) : (
              <div className="notice" style={{ marginTop: 24 }}>Kontrak belum dikonfigurasi. Isi .env.local dan deploy contract terlebih dahulu.</div>
            )}
          </div>
          <div className="visual">
            <div className="card main">
              <div className="eyebrow">Campaign aktif</div>
              <h2>Panen Cabai Organik</h2>
              <p style={{ color: "var(--muted)" }}>Jawa Barat · 18 investor</p>
              <div className="meter"><span /></div>
              <strong>76,000 TNC</strong>
              <span style={{ color: "var(--muted)", float: "right" }}>100,000 TNC</span>
            </div>
            <div className="card small">
              <div className="eyebrow">Status</div>
              <h3 style={{ margin: "8px 0" }}>● Voting dibuka</h3>
              <small style={{ color: "var(--muted)" }}>Pencairan #02 · 19 jam</small>
            </div>
          </div>
        </section>
        <section className="section">
          <div className="grid">
            <div className="feature"><h3>Terbuka</h3><p>State dan event campaign tersimpan di smart contract Monad sebagai sumber kebenaran.</p></div>
            <div className="feature"><h3>Berbasis bukti</h3><p>Dokumen pendukung disimpan di IPFS dan dirujuk melalui manifest yang dapat diverifikasi.</p></div>
            <div className="feature"><h3>Voting investor</h3><p>Setiap pencairan melewati voting dengan bobot sesuai kontribusi yang tercatat.</p></div>
          </div>
        </section>
        {isConfigured ? (
          <section className="section">
            <div className="eyebrow">Campaign terbaru</div>
            <h2 style={{ marginTop: 8 }}>Daftar campaign</h2>
            {isLoading ? (
              <div className="grid" style={{ marginTop: 16 }}>{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} showProgress />)}</div>
            ) : error ? (
              <ErrorMessage error={error as Error} onRetry={() => refetch()} />
            ) : latest.length === 0 ? (
              <EmptyState title="Belum ada campaign" description="Jadilah yang pertama membuat campaign pendanaan." action={{ label: "Buat campaign", href: "/campaigns/new" }} />
            ) : (
              <div className="grid" style={{ marginTop: 16 }}>
                {latest.map((c) => (
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
                      farmerLabel={formatAddress(c.farmer)}
                    />
                  </Link>
                ))}
              </div>
            )}
          </section>
        ) : null}
      </main>
    </>
  );
}

