"use client";
import Link from "next/link";
import { Navigation } from "../components/Navigation";
import { useCampaigns } from "../hooks/useCampaigns";
import { useNowSeconds } from "../hooks/useNowSeconds";
import { isConfigured } from "../lib/contract";
import { formatTani, formatDate, formatAddress } from "../lib/format";

import { CampaignCard } from "../components/campaign/CampaignCard";

import { EmptyState } from "../components/ui/EmptyState";
import { Skeleton } from "../components/ui/Skeleton";
import { ErrorMessage } from "../components/ui/ErrorMessage";

export default function Home() {
  const { data: campaigns, isLoading, error, refetch } = useCampaigns();
  const now = useNowSeconds();
  const latest = (campaigns ?? []).slice(0, 6);
  const totalRaised = (campaigns ?? []).reduce((a, c) => a + c.totalRaised, 0n);

  return (
    <>
      <Navigation />
      <main>
        <section className="hero">
          <div>
            <div className="landing-kicker"><span className="kicker-dot" /> Terbuka untuk semua · Dibangun di Monad</div>
            <h1>Pendanaan tani yang <em>bisa diaudit.</em></h1>
            <p className="lead">TaniTrace menghubungkan petani dan investor melalui campaign transparan. Kontribusi, bukti, voting, dan pencairan dicatat on-chain.</p>
            <div className="actions">
              <Link className="button" href="/campaigns">Lihat campaign</Link>
              <Link className="button secondary" href="/campaigns/new">Buat campaign</Link>
            </div>
            {isConfigured ? (
              <div className="hero-stats">
                <div><strong>{campaigns?.length ?? 0}</strong><span>Campaign aktif</span></div>
                <div><strong>{formatTani(totalRaised)} <small>TNC</small></strong><span>Total terkumpul</span></div>
              </div>
            ) : (
              <div className="notice hero-notice">Kontrak belum dikonfigurasi. Isi .env.local dan deploy contract terlebih dahulu.</div>
            )}
          </div>
          <div className="visual landing-visual">
            <div className="visual-orbit orbit-one" />
            <div className="visual-orbit orbit-two" />
            <div className="visual-label">TRANSPARENCY LAYER <span>01</span></div>
            <div className="card main">
              <div className="card-heading"><span className="status-dot" /> Campaign aktif <span className="live-label">LIVE</span></div>
              <h2>Panen Cabai Organik</h2>
              <p style={{ color: "var(--muted)" }}>Jawa Barat · 18 investor</p>
              <div className="meter"><span /></div>
              <strong>76,000 TNC</strong>
              <span style={{ color: "var(--muted)", float: "right" }}>100,000 TNC</span>
            </div>
            <div className="card small">
              <div className="eyebrow">Status pencairan</div>
              <h3 style={{ margin: "8px 0" }}>● Voting dibuka</h3>
              <small style={{ color: "var(--muted)" }}>Pencairan #02 · 19 jam</small>
            </div>
          </div>
        </section>
        <section className="trust-strip" aria-label="TaniTrace highlights">
          <span className="trust-intro">Satu sumber kebenaran untuk</span>
          <span><b>01</b> Bukti panen</span><span><b>02</b> Dana investor</span><span><b>03</b> Keputusan bersama</span>
        </section>
        <section className="section story-section">
          <div className="section-heading"><div><div className="eyebrow">Cara kerja</div><h2>Dari lahan ke ledger.</h2></div><p>Setiap langkah dibuat sederhana untuk petani, jelas untuk investor, dan terbuka untuk diverifikasi siapa saja.</p></div>
          <div className="process-grid">
            <div className="process-card"><span className="process-number">01</span><div className="process-icon">↗</div><h3>Buat campaign</h3><p>Petani menjelaskan kebutuhan modal, target panen, dan bukti pendukungnya.</p></div>
            <div className="process-card process-card-featured"><span className="process-number">02</span><div className="process-icon">◌</div><h3>Danai dengan yakin</h3><p>Investor melihat target, progres, dan dokumen sebelum berkontribusi.</p></div>
            <div className="process-card"><span className="process-number">03</span><div className="process-icon">✓</div><h3>Verifikasi bersama</h3><p>Pencairan diputuskan lewat voting dan seluruh aktivitas tersimpan on-chain.</p></div>
          </div>
        </section>
        <section className="section">
          <div className="section-heading compact-heading"><div><div className="eyebrow">Kenapa TaniTrace</div><h2>Kepercayaan, by design.</h2></div></div>
          <div className="grid">
            <div className="feature"><span className="feature-index">01</span><h3>Terbuka</h3><p>State dan event campaign tersimpan di smart contract Monad sebagai sumber kebenaran.</p><span className="feature-link">Lihat di ledger ↗</span></div>
            <div className="feature"><span className="feature-index">02</span><h3>Berbasis bukti</h3><p>Dokumen pendukung disimpan di IPFS dan dirujuk melalui manifest yang dapat diverifikasi.</p><span className="feature-link">Baca selengkapnya ↗</span></div>
            <div className="feature"><span className="feature-index">03</span><h3>Voting investor</h3><p>Setiap pencairan melewati voting dengan bobot sesuai kontribusi yang tercatat.</p><span className="feature-link">Pelajari mekanismenya ↗</span></div>
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
                      deadlinePassed={now !== null && now >= Number(c.fundingDeadline)}
                      farmerLabel={formatAddress(c.farmer)}
                    />
                  </Link>
                ))}
              </div>
            )}
          </section>
        ) : null}
        <section className="landing-cta">
          <div><div className="eyebrow">Mulai dari sini</div><h2>Modal yang tumbuh<br /><em>bersama.</em></h2></div>
          <div><p>Temukan campaign yang ingin kamu dukung atau mulai ceritakan kebutuhan panenmu hari ini.</p><Link className="button" href="/campaigns">Jelajahi campaign ↗</Link></div>
        </section>
      </main>
    </>
  );
}

