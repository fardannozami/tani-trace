export type AdvisoryFinding = {
  label: string;
  detail?: string;
  severity?: "info" | "warning" | "error";
};

export type AdvisoryReport = {
  summary: string;
  findings: AdvisoryFinding[];
  disclaimer: string;
};

export const ADVISORY_DISCLAIMER =
  "Laporan ini bersifat advisory (pemeriksaan awal AI), bukan keputusan on-chain. Dapat salah dan tidak memverifikasi keaslian bukti.";

export const ADVISORY_UI_LABELS = {
  title: "Pemeriksaan Awal Berkas",
  loading: "Menganalisis berkas...",
  unavailable: "Advisory tidak tersedia",
  notConfigured: "AI tidak dikonfigurasi",
};

export function normalizeAdvisoryReport(raw: unknown): AdvisoryReport | null {
  if (!raw || typeof raw !== "object") return null;
  const obj = raw as Record<string, unknown>;
  const summary = typeof obj.summary === "string" ? obj.summary.slice(0, 500) : "";
  const findingsRaw = Array.isArray(obj.findings) ? obj.findings : [];
  const findings: AdvisoryFinding[] = [];
  for (const f of findingsRaw.slice(0, 20)) {
    if (!f || typeof f !== "object") continue;
    const fo = f as Record<string, unknown>;
    const label = typeof fo.label === "string" ? fo.label.slice(0, 120) : "";
    if (!label) continue;
    const detail = typeof fo.detail === "string" ? fo.detail.slice(0, 400) : undefined;
    const sev = fo.severity === "warning" || fo.severity === "error" || fo.severity === "info" ? fo.severity : "info";
    findings.push({ label, detail, severity: sev });
  }
  return { summary, findings, disclaimer: ADVISORY_DISCLAIMER };
}