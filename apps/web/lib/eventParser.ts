export type AuditEventGroup = "campaign" | "funding" | "disbursement" | "vote" | "refund" | "lifecycle";

export type AuditEventMeta = {
  name: string;
  label: string;
  group: AuditEventGroup;
};

export const AUDIT_EVENTS: AuditEventMeta[] = [
  { name: "CampaignCreated", label: "Campaign dibuat", group: "campaign" },
  { name: "ContributionMade", label: "Kontribusi masuk", group: "funding" },
  { name: "CampaignActivated", label: "Campaign aktif", group: "lifecycle" },
  { name: "CampaignFailed", label: "Campaign gagal", group: "lifecycle" },
  { name: "DisbursementRequested", label: "Pengajuan pencairan", group: "disbursement" },
  { name: "VoteCast", label: "Suara diberikan", group: "vote" },
  { name: "RequestFinalized", label: "Pengajuan difinalisasi", group: "disbursement" },
  { name: "DisbursementPaid", label: "Pencairan dibayar", group: "disbursement" },
  { name: "RefundClaimed", label: "Refund diklaim", group: "refund" },
  { name: "CampaignCompleted", label: "Campaign selesai", group: "lifecycle" },
];

export function getAuditEventMeta(name: string): AuditEventMeta | undefined {
  return AUDIT_EVENTS.find((e) => e.name === name);
}