import { buttonStyles } from "./styles";

export type TransactionStatusKind = "idle" | "awaiting-wallet" | "pending" | "success" | "error";

export interface TransactionStatusProps {
  status: TransactionStatusKind;
  /** Full transaction hash (0x...) untuk tautan explorer. */
  txHash?: string;
  /** Pesan tambahan dari caller, opsional. */
  message?: string;
  /** URL lengkap ke explorer untuk txHash (mis. dari lib/chain). */
  explorerUrl?: string;
}

const SPINNER = `<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><circle cx="12" cy="12" r="9" opacity=".25"/><path d="M21 12a9 9 0 0 0-9-9"><animateTransform attributeName="transform" type="rotate" from="0 12 12" to="360 12 12" dur="0.9s" repeatCount="indefinite"/></path></svg>`;
const CHECK = `<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="M4.5 12.5 10 18 19.5 6.5"/></svg>`;
const X = `<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round"><path d="M6 6l12 12M18 6 6 18"/></svg>`;
const CLOCK = `<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><circle cx="12" cy="12" r="9"/><path d="M12 7v5.5l3.5 2"/></svg>`;

function shorten(hash: string): string {
  return hash.length > 14 ? `${hash.slice(0, 10)}…${hash.slice(-6)}` : hash;
}

export function TransactionStatus({ status, txHash, message, explorerUrl }: TransactionStatusProps) {
  if (status === "idle") return null;
  const icon =
    status === "awaiting-wallet" ? CLOCK : status === "pending" ? SPINNER : status === "success" ? CHECK : X;
  const defaultTitle =
    status === "awaiting-wallet"
      ? "Menunggu konfirmasi di wallet"
      : status === "pending"
        ? "Transaksi diproses"
        : status === "success"
          ? "Transaksi terkirim"
          : "Transaksi gagal";
  return (
    <>
      <style href="tt-buttons" precedence="tt-ui">{buttonStyles}</style>
      <style href="tt-tx-status" precedence="tt-ui">{`
        .tt-tx{display:flex;gap:12px;align-items:flex-start;padding:14px 16px;border-radius:14px;border:1px solid var(--line);background:var(--card);}
        .tt-tx[data-state="awaiting-wallet"]{background:var(--amber-soft);border-color:rgba(138,90,0,.2);}
        .tt-tx[data-state="pending"]{background:var(--mint);border-color:rgba(31,107,77,.18);}
        .tt-tx[data-state="success"]{background:var(--mint);border-color:rgba(31,107,77,.28);}
        .tt-tx[data-state="error"]{background:var(--danger-soft);border-color:rgba(150,57,44,.25);}
        .tt-tx-icon{flex:none;width:30px;height:30px;border-radius:50%;display:grid;place-items:center;background:#fffdf9;border:1px solid var(--line);}
        .tt-tx[data-state="pending"] .tt-tx-icon,.tt-tx[data-state="success"] .tt-tx-icon{color:var(--green);}
        .tt-tx[data-state="awaiting-wallet"] .tt-tx-icon{color:var(--amber);}
        .tt-tx[data-state="error"] .tt-tx-icon{color:var(--danger);}
        .tt-tx-body{min-width:0;}
        .tt-tx-title{margin:3px 0 2px;font:700 15px 'Space Grotesk',sans-serif;color:var(--ink);}
        .tt-tx-msg{margin:0;font-size:13.5px;line-height:1.55;color:var(--muted);}
        .tt-tx-hash{display:inline-flex;align-items:center;gap:6px;margin-top:8px;font-size:13px;font-weight:700;color:var(--green);border-bottom:1px dashed rgba(31,107,77,.4);padding-bottom:1px;}
        .tt-tx-hash:hover{color:var(--green-deep);border-bottom-style:solid;}
        .tt-tx-hash:focus-visible{outline:2px solid var(--green);outline-offset:2px;border-radius:4px;}
      `}</style>
      <div className="tt-tx" data-state={status} role={status === "error" ? "alert" : "status"} aria-live="polite">
        <span className="tt-tx-icon" aria-hidden="true" dangerouslySetInnerHTML={{ __html: icon }} />
        <div className="tt-tx-body">
          <p className="tt-tx-title">{defaultTitle}</p>
          {message ? <p className="tt-tx-msg">{message}</p> : null}
          {txHash && explorerUrl ? (
            <a className="tt-tx-hash" href={explorerUrl} target="_blank" rel="noopener noreferrer" aria-label={`Lihat transaksi ${shorten(txHash)} di explorer`}>
              Lihat di explorer · {shorten(txHash)}
            </a>
          ) : null}
        </div>
      </div>
    </>
  );
}
