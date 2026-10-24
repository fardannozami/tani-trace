export type CampaignStatusKey = "FUNDING" | "ACTIVE" | "FAILED" | "COMPLETED";
export type RequestStatusKey = "PENDING" | "APPROVED" | "REJECTED" | "EXPIRED" | "PAID";
export type StatusKey = CampaignStatusKey | RequestStatusKey;
export type Tone = "green" | "amber" | "red" | "neutral";

export const CAMPAIGN_ORDER: CampaignStatusKey[] = ["FUNDING", "ACTIVE", "FAILED", "COMPLETED"];
export const REQUEST_ORDER: RequestStatusKey[] = ["PENDING", "APPROVED", "REJECTED", "EXPIRED", "PAID"];

export const CAMPAIGN: Record<CampaignStatusKey, { label: string; tone: Tone }> = {
  FUNDING: { label: "Pendanaan berjalan", tone: "amber" },
  ACTIVE: { label: "Aktif", tone: "green" },
  FAILED: { label: "Gagal", tone: "red" },
  COMPLETED: { label: "Selesai", tone: "neutral" },
};

export const REQUEST: Record<RequestStatusKey, { label: string; tone: Tone }> = {
  PENDING: { label: "Menunggu voting", tone: "amber" },
  APPROVED: { label: "Disetujui", tone: "green" },
  REJECTED: { label: "Ditolak", tone: "red" },
  EXPIRED: { label: "Kedaluwarsa", tone: "neutral" },
  PAID: { label: "Dibayarkan", tone: "green" },
};

/**
 * Label + warna badge status.
 *
 * `deadlinePassed` dipakai untuk campaign: setelah batas waktu lewat status
 * on-chain masih FUNDING, jadi badge menampilkan "Menunggu finalisasi"
 * alih-alih "Pendanaan berjalan" yang menyesatkan.
 */
export function getStatusMeta(status: StatusKey | number, domain: "campaign" | "request" = "campaign", deadlinePassed = false): { label: string; tone: Tone } {
  const campaignMap: Record<string, { label: string; tone: Tone }> = CAMPAIGN;
  const requestMap: Record<string, { label: string; tone: Tone }> = REQUEST;
  if (typeof status === "number") {
    const key = domain === "request" ? REQUEST_ORDER[status] : CAMPAIGN_ORDER[status];
    if (!key) return { label: "Tidak diketahui", tone: "neutral" };
    if (domain === "request") return requestMap[key];
    if (deadlinePassed && key === "FUNDING") return { label: "Menunggu finalisasi", tone: "amber" };
    return campaignMap[key];
  }
  if (domain === "request") return requestMap[status] ?? { label: "Tidak diketahui", tone: "neutral" };
  if (deadlinePassed && status === "FUNDING") return { label: "Menunggu finalisasi", tone: "amber" };
  return campaignMap[status] ?? requestMap[status] ?? { label: "Tidak diketahui", tone: "neutral" };
}
