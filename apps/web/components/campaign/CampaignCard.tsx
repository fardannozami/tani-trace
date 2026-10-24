import { StatusBadge } from "./StatusBadge";
import type { StatusKey } from "./StatusBadge";
import { buttonStyles, cardStyles } from "../ui/styles";

export interface CampaignCardProps {
  title: string;
  crop: string;
  location: string;
  /** Nilai target sudah diformat tampilan, mis. "100.000 TNC". */
  targetLabel: string;
  /** Nilai terkumpul sudah diformat tampilan, mis. "76.000 TNC". */
  raisedLabel: string;
  /** Progres 0..1 (dibulatkan komponen ke persen). */
  progress: number;
  status: StatusKey | number;
  /** Deadline sudah diformat, mis. "30 Okt 2026, 14.00". */
  deadlineLabel: string;
  /** Nama atau alamat pendek petani, mis. "0x1234…abcd" atau "Pak Surya". */
  farmerLabel: string;
  className?: string;
}

function clamp(n: number): number {
  if (!Number.isFinite(n)) return 0;
  return Math.min(1, Math.max(0, n));
}

export function CampaignCard({
  title,
  crop,
  location,
  targetLabel,
  raisedLabel,
  progress,
  status,
  deadlineLabel,
  farmerLabel,
  className,
}: CampaignCardProps) {
  const pct = Math.round(clamp(progress) * 100);
  return (
    <>
      <style href="tt-buttons" precedence="tt-ui">{buttonStyles}</style>
      <style href="tt-card" precedence="tt-ui">{cardStyles}</style>
      <style href="tt-campaign-card" precedence="tt-ui">{`
        .tt-campaign{display:flex;flex-direction:column;gap:0;padding:22px;transition:transform .18s ease,box-shadow .18s ease;}
        .tt-campaign:hover{transform:translateY(-3px);box-shadow:0 18px 40px rgba(31,107,77,.14);}
        .tt-campaign-top{display:flex;justify-content:space-between;align-items:flex-start;gap:12px;}
        .tt-campaign-crop{font:700 11.5px 'DM Sans',sans-serif;letter-spacing:.1em;text-transform:uppercase;color:var(--green);background:var(--mint);border-radius:var(--radius-pill);padding:5px 11px;white-space:nowrap;}
        .tt-campaign h3{margin:14px 0 4px;font:700 20px 'Space Grotesk',sans-serif;letter-spacing:-.02em;color:var(--ink);line-height:1.25;}
        .tt-campaign-loc{margin:0;font-size:13.5px;color:var(--muted);line-height:1.5;}
        .tt-campaign-meter{height:8px;border-radius:20px;background:#dce8df;margin:18px 0 8px;overflow:hidden;}
        .tt-campaign-meter span{display:block;height:100%;background:var(--green);border-radius:20px;transition:width .5s cubic-bezier(.22,1,.36,1);}
        .tt-campaign-figures{display:flex;justify-content:space-between;align-items:baseline;gap:10px;}
        .tt-campaign-raised{font:700 16px 'Space Grotesk',sans-serif;color:var(--ink);font-variant-numeric:tabular-nums;}
        .tt-campaign-target{font-size:13px;color:var(--muted);font-variant-numeric:tabular-nums;}
        .tt-campaign-foot{display:flex;justify-content:space-between;align-items:center;gap:10px;margin-top:16px;padding-top:14px;border-top:1px solid var(--line);font-size:13px;color:var(--muted);}
        .tt-campaign-foot dt{font-weight:700;color:var(--ink);font-size:12.5px;}
        .tt-campaign-foot dd{margin:2px 0 0;}
        .tt-campaign-foot .col{min-width:0;}
        .tt-campaign-foot .col.right{text-align:right;}
        @media (prefers-reduced-motion: reduce){.tt-campaign:hover{transform:none;}}
      `}</style>
      <article className={`tt-card tt-campaign${className ? ` ${className}` : ""}`} aria-label={`Campaign ${title}`}>
        <div className="tt-campaign-top">
          <span className="tt-campaign-crop">{crop}</span>
          <StatusBadge status={status} />
        </div>
        <h3>{title}</h3>
        <p className="tt-campaign-loc">{location}</p>
        <div
          className="tt-campaign-meter"
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={pct}
          aria-label={`Pendanaan terkumpul ${pct} persen dari target`}
        >
          <span style={{ width: `${pct}%` }} />
        </div>
        <div className="tt-campaign-figures">
          <strong className="tt-campaign-raised">{raisedLabel}</strong>
          <span className="tt-campaign-target">dari target {targetLabel}</span>
        </div>
        <dl className="tt-campaign-foot">
          <div className="col">
            <dt>Petani</dt>
            <dd>{farmerLabel}</dd>
          </div>
          <div className="col right">
            <dt>Batas waktu</dt>
            <dd>{deadlineLabel}</dd>
          </div>
        </dl>
      </article>
    </>
  );
}
