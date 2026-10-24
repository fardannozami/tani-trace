export type CampaignStatusKey = "FUNDING" | "ACTIVE" | "FAILED" | "COMPLETED";
export type RequestStatusKey = "PENDING" | "APPROVED" | "REJECTED" | "EXPIRED" | "PAID";
export type StatusKey = CampaignStatusKey | RequestStatusKey;

/** Terima string enum (FUNDING, PAID, ...) atau angka enum on-chain (0..n) sesuai lib/types. */
export interface StatusBadgeProps {
  status: StatusKey | number;
  /** Dipakai saat status berupa angka, karena Campaign & Request enum tumpang tindih. */
  domain?: "campaign" | "request";
  className?: string;
}

const CAMPAIGN_ORDER: CampaignStatusKey[] = ["FUNDING", "ACTIVE", "FAILED", "COMPLETED"];
const REQUEST_ORDER: RequestStatusKey[] = ["PENDING", "APPROVED", "REJECTED", "EXPIRED", "PAID"];

type Tone = "green" | "amber" | "red" | "neutral";

const CAMPAIGN: Record<CampaignStatusKey, { label: string; tone: Tone }> = {
  FUNDING: { label: "Pendanaan berjalan", tone: "amber" },
  ACTIVE: { label: "Aktif", tone: "green" },
  FAILED: { label: "Gagal", tone: "red" },
  COMPLETED: { label: "Selesai", tone: "neutral" },
};

const REQUEST: Record<RequestStatusKey, { label: string; tone: Tone }> = {
  PENDING: { label: "Menunggu voting", tone: "amber" },
  APPROVED: { label: "Disetujui", tone: "green" },
  REJECTED: { label: "Ditolak", tone: "red" },
  EXPIRED: { label: "Kedaluwarsa", tone: "neutral" },
  PAID: { label: "Dibayarkan", tone: "green" },
};

export function getStatusMeta(status: StatusKey | number, domain: "campaign" | "request" = "campaign"): { label: string; tone: Tone } {
  const campaignMap: Record<string, { label: string; tone: Tone }> = CAMPAIGN;
  const requestMap: Record<string, { label: string; tone: Tone }> = REQUEST;
  if (typeof status === "number") {
    const key = domain === "request" ? REQUEST_ORDER[status] : CAMPAIGN_ORDER[status];
    if (!key) return { label: "Tidak diketahui", tone: "neutral" };
    return domain === "request" ? requestMap[key] : campaignMap[key];
  }
  if (domain === "request") return requestMap[status] ?? { label: "Tidak diketahui", tone: "neutral" };
  return campaignMap[status] ?? requestMap[status] ?? { label: "Tidak diketahui", tone: "neutral" };
}

export function StatusBadge({ status, domain = "campaign", className }: StatusBadgeProps) {
  const { label, tone } = getStatusMeta(status, domain);
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
