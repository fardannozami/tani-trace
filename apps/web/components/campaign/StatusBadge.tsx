import { getStatusMeta, type CampaignStatusKey, type RequestStatusKey, type StatusKey } from "../../lib/status";

export type { CampaignStatusKey, RequestStatusKey, StatusKey };
export { getStatusMeta };

/** Terima string enum (FUNDING, PAID, ...) atau angka enum on-chain (0..n) sesuai lib/types. */
export interface StatusBadgeProps {
  status: StatusKey | number;
  /** Dipakai saat status berupa angka, karena Campaign & Request enum tumpang tindih. */
  domain?: "campaign" | "request";
  /**
   * Campaign yang deadline-nya sudah lewat tapi belum difinalisasi.
   * Status on-chain masih FUNDING, jadi label "Pendanaan berjalan" menyesatkan.
   */
  deadlinePassed?: boolean;
  className?: string;
}

export function StatusBadge({ status, domain = "campaign", deadlinePassed = false, className }: StatusBadgeProps) {
  const { label, tone } = getStatusMeta(status, domain, deadlinePassed);
  return (
    <>
      <style href="tt-badges" precedence="tt-ui">{`
        .tt-badge{display:inline-flex;align-items:center;gap:6px;border-radius:var(--radius-pill);padding:5px 11px;font:700 12px 'DM Sans',sans-serif;letter-spacing:.02em;white-space:nowrap;}
        .tt-badge::before{content:'';width:7px;height:7px;border-radius:50%;background:currentColor;flex:none;}
        .tt-badge-green{background:var(--mint);color:var(--green-deep);}
        .tt-badge-amber{background:var(--amber-soft);color:var(--amber);}
        .tt-badge-red{background:var(--danger-soft);color:var(--danger);}
        .tt-badge-neutral{background:#ece9df;color:var(--muted);}
      `}</style>
      <span className={`tt-badge tt-badge-${tone}${className ? ` ${className}` : ""}`} data-status={label}>
        {label}
      </span>
    </>
  );
}
