import { ErrorMessage } from "../ui/ErrorMessage";
import type { FlexibleError } from "../ui/ErrorMessage";

export interface AdvisoryFinding {
  severity?: string;
  label: string;
  detail?: string;
}

export interface AdvisoryReportLike {
  summary?: string;
  findings?: AdvisoryFinding[];
  notes?: string;
  /** Label ringkas hasil, mis. "Perlu perhatian" — opsional. */
  label?: string;
}

export interface AdvisoryCardProps {
  report?: AdvisoryReportLike | null;
  error?: FlexibleError | null;
  busy?: boolean;
  className?: string;
}

type SeverityTone = "info" | "warning" | "error";

function severityTone(sev?: string): SeverityTone {
  const s = (sev ?? "").toLowerCase();
  if (s === "error" || s === "critical" || s === "high" || s === "danger") return "error";
  if (s === "warning" || s === "warn" || s === "medium" || s === "caution") return "warning";
  return "info";
}

const SEVERITY_LABEL: Record<SeverityTone, string> = { info: "Info", warning: "Perhatian", error: "Risiko" };

export function AdvisoryCard({ report, error, busy, className }: AdvisoryCardProps) {
  const findings = report?.findings ?? [];
  return (
    <>
      <style href="tt-advisory" precedence="tt-ui">{`
        .tt-advisory{padding:22px;background:var(--card);border:1px solid var(--line);border-radius:var(--radius-card);}
        .tt-advisory-head{display:flex;flex-wrap:wrap;justify-content:space-between;align-items:center;gap:10px;margin-bottom:12px;}
        .tt-advisory-head h3{margin:0;font:700 18px 'Space Grotesk',sans-serif;letter-spacing:-.02em;color:var(--ink);}
        .tt-advisory-label{font:700 12px 'DM Sans',sans-serif;border-radius:var(--radius-pill);padding:5px 11px;background:var(--mint);color:var(--green-deep);}
        .tt-advisory-summary{margin:0 0 16px;font-size:14.5px;line-height:1.65;color:var(--ink);}
        .tt-advisory-list{list-style:none;margin:0;padding:0;display:flex;flex-direction:column;gap:12px;}
        .tt-advisory-item{display:flex;gap:12px;padding:13px 15px;border-radius:12px;background:var(--cream);border:1px solid var(--line);}
        .tt-advisory-dot{flex:none;width:9px;height:9px;border-radius:50%;margin-top:6px;}
        .tt-advisory-item[data-tone="info"] .tt-advisory-dot{background:var(--green);}
        .tt-advisory-item[data-tone="warning"] .tt-advisory-dot{background:var(--amber);}
        .tt-advisory-item[data-tone="error"] .tt-advisory-dot{background:var(--danger);}
        .tt-advisory-item h4{margin:0 0 3px;font:700 14px 'DM Sans',sans-serif;color:var(--ink);display:flex;flex-wrap:wrap;align-items:baseline;gap:8px;}
        .tt-advisory-sev{font-size:11px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;}
        .tt-advisory-item[data-tone="info"] .tt-advisory-sev{color:var(--green);}
        .tt-advisory-item[data-tone="warning"] .tt-advisory-sev{color:var(--amber);}
        .tt-advisory-item[data-tone="error"] .tt-advisory-sev{color:var(--danger);}
        .tt-advisory-item p{margin:0;font-size:13.5px;line-height:1.6;color:var(--muted);}
        .tt-advisory-notes{margin:16px 0 0;font-size:13px;line-height:1.6;color:var(--muted);}
        .tt-advisory-disclaimer{margin:18px 0 0;padding-top:14px;border-top:1px dashed var(--line);font-size:12.5px;line-height:1.6;color:var(--muted);}
        .tt-advisory-idle{margin:0;font-size:14.5px;line-height:1.65;color:var(--muted);}
        .tt-advisory-busy{display:flex;align-items:center;gap:12px;margin:0;font-size:14.5px;color:var(--muted);}
        .tt-advisory-busy::before{content:'';flex:none;width:18px;height:18px;border-radius:50%;border:2.4px solid var(--mint);border-top-color:var(--green);animation:tt-adv-spin .8s linear infinite;}
        @keyframes tt-adv-spin{to{transform:rotate(360deg)}}
        @media (prefers-reduced-motion: reduce){.tt-advisory-busy::before{animation:none;}}
      `}</style>
      <section className={`tt-advisory${className ? ` ${className}` : ""}`} aria-label="Pemeriksaan awal berkas (advisory)">
        <div className="tt-advisory-head">
          <h3>Pemeriksaan awal berkas</h3>
          {report?.label && !busy && !error ? <span className="tt-advisory-label">{report.label}</span> : null}
        </div>
        {busy ? (
          <p className="tt-advisory-busy">Menganalisis berkas… hasil menyusul.</p>
        ) : error ? (
          <ErrorMessage error={error} />
        ) : report && (report.summary || findings.length > 0) ? (
          <>
            {report.summary ? <p className="tt-advisory-summary">{report.summary}</p> : null}
            {findings.length > 0 ? (
              <ul className="tt-advisory-list">
                {findings.map((f, i) => {
                  const tone = severityTone(f.severity);
                  return (
                    <li key={i} className="tt-advisory-item" data-tone={tone}>
                      <span className="tt-advisory-dot" aria-hidden="true" />
                      <div>
                        <h4>
                          {f.label}
                          <span className="tt-advisory-sev">{SEVERITY_LABEL[tone]}</span>
                        </h4>
                        {f.detail ? <p>{f.detail}</p> : null}
                      </div>
                    </li>
                  );
                })}
              </ul>
            ) : null}
            {report.notes ? <p className="tt-advisory-notes">{report.notes}</p> : null}
          </>
        ) : (
          <p className="tt-advisory-idle">
            Belum ada hasil pemeriksaan untuk berkas ini. Anda tetap dapat melanjutkan — advisory bersifat pelengkap.
          </p>
        )}
        <p className="tt-advisory-disclaimer">
          Catatan: ini adalah pemeriksaan awal otomatis (advisory), bukan keputusan on-chain dan bukan jaminan kebenaran.
          Hasil dapat keliru; keputusan tetap ada pada Anda dan voting investor.
        </p>
      </section>
    </>
  );
}
