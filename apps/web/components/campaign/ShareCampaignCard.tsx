import { QRCodeSVG } from "qrcode.react";
import { CopyButton } from "../ui/CopyButton";
import { cardStyles } from "../ui/styles";

export interface ShareCampaignCardProps {
  url: string;
  title?: string;
  className?: string;
}

type HostKind = "public" | "lan" | "local";

/** Kelasifikasi host URL: loopback, jaringan lokal (LAN), atau publik. */
export function classifyHost(rawUrl: string): HostKind {
  let host = "";
  try {
    host = new URL(rawUrl).hostname.toLowerCase();
  } catch {
    host = rawUrl.toLowerCase();
  }
  if (host === "localhost" || host === "127.0.0.1" || host === "::1" || host === "[::1]" || host.endsWith(".local")) return "local";
  if (/^(10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.)/.test(host) || host.endsWith(".lan")) return "lan";
  return "public";
}

export function ShareCampaignCard({ url, title, className }: ShareCampaignCardProps) {
  const hostKind = classifyHost(url);
  return (
    <>
      <style href="tt-card" precedence="tt-ui">{cardStyles}</style>
      <style href="tt-share" precedence="tt-ui">{`
        .tt-share{padding:22px;}
        .tt-share h3{margin:0 0 4px;font:700 18px 'Space Grotesk',sans-serif;letter-spacing:-.02em;color:var(--ink);}
        .tt-share-sub{margin:0 0 18px;font-size:13.5px;color:var(--muted);}
        .tt-share-inner{display:flex;gap:20px;align-items:center;flex-wrap:wrap;}
        .tt-share-qr{flex:none;padding:12px;background:#fff;border:1px solid var(--line);border-radius:14px;line-height:0;}
        .tt-share-url{min-width:0;flex:1 1 220px;display:flex;flex-direction:column;gap:12px;}
        .tt-share-url code{display:block;font-size:12.5px;line-height:1.55;color:var(--muted);background:var(--cream);border:1px solid var(--line);border-radius:10px;padding:10px 12px;word-break:break-all;}
        .tt-share-note{display:flex;gap:10px;margin:18px 0 0;padding:12px 14px;border-radius:12px;font-size:13px;line-height:1.6;}
        .tt-share-note strong{display:block;color:var(--ink);font-size:13px;margin-bottom:2px;}
        .tt-share-note-local{background:var(--amber-soft);color:var(--amber);border:1px solid rgba(138,90,0,.2);}
        .tt-share-note-local strong{color:var(--amber);}
        .tt-share-note-lan{background:var(--mint);color:var(--green-deep);border:1px solid rgba(20,81,59,.15);}
        .tt-share-note-lan strong{color:var(--green-deep);}
        .tt-share-note p{margin:0;}
      `}</style>
      <section className={`tt-card tt-share${className ? ` ${className}` : ""}`} aria-label="Bagikan campaign">
        <h3>Bagikan campaign</h3>
        <p className="tt-share-sub">{title ? `Pindai atau salin tautan untuk membuka “${title}”.` : "Pindai QR atau salin tautan untuk membuka campaign."}</p>
        <div className="tt-share-inner">
          <div className="tt-share-qr">
            <QRCodeSVG value={url} size={148} level="M" bgColor="#ffffff" fgColor="#12211d" title="QR code tautan campaign" />
          </div>
          <div className="tt-share-url">
            <code>{url}</code>
            <div>
              <CopyButton text={url} />
            </div>
          </div>
        </div>
        {hostKind === "local" ? (
          <div className="tt-share-note tt-share-note-local" role="note">
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ flex: "none", marginTop: 2 }}><path d="M12 3 2.5 20h19z"/><path d="M12 10v4.5M12 17.5v.01"/></svg>
            <p>
              <strong>QR ini hanya berlaku di komputer Anda.</strong>
              URL memakai <code style={{ fontSize: "inherit" }}>localhost</code>, jadi tidak bisa dibuka dari perangkat lain.
              Gunakan alamat IP LAN (mis. <code style={{ fontSize: "inherit" }}>http://192.168.x.x:3000</code>) atau URL publik agar QR ini bisa dipindai siapa saja.
            </p>
          </div>
        ) : hostKind === "lan" ? (
          <div className="tt-share-note tt-share-note-lan" role="note">
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true" style={{ flex: "none", marginTop: 2 }}><circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 7.5v.01"/></svg>
            <p>
              <strong>Berlaku di jaringan lokal.</strong>
              Perangkat lain harus berada di Wi-Fi/jaringan yang sama dengan server ini untuk membuka tautan.
            </p>
          </div>
        ) : null}
      </section>
    </>
  );
}
