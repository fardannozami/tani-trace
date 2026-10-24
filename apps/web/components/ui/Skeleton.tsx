export interface SkeletonProps {
  /** Jumlah baris teks skeleton di bawah judul. */
  lines?: number;
  /** Tampilkan baris progress skeleton. */
  showProgress?: boolean;
  className?: string;
}

const SKELETON_CSS = `
  .tt-skeleton{background:var(--card);border:1px solid var(--line);border-radius:var(--radius-card);padding:22px;}
  .tt-skeleton-row{display:flex;justify-content:space-between;align-items:center;gap:12px;margin-bottom:14px;}
  .tt-skeleton-row-item{display:flex;align-items:center;gap:14px;padding:14px 18px;background:var(--card);border:1px solid var(--line);border-radius:14px;}
  .tt-skeleton-bar{height:12px;border-radius:8px;background:linear-gradient(90deg,#eceadf 25%,#f6f4ea 50%,#eceadf 75%);background-size:200% 100%;}
  .tt-skeleton-bar.w40{width:40%;}
  .tt-skeleton-bar.w70{width:70%;}
  .tt-skeleton-bar.w100{width:100%;}
  .tt-skeleton-pill{width:104px;height:24px;border-radius:var(--radius-pill);background:linear-gradient(90deg,#eceadf 25%,#f6f4ea 50%,#eceadf 75%);background-size:200% 100%;}
  .tt-skeleton-meter{height:8px;border-radius:20px;background:#dce8df;overflow:hidden;margin:16px 0 10px;}
  .tt-skeleton-meter span{display:block;height:100%;width:35%;background:#c4d8c9;}
  .tt-skeleton-lines{display:flex;flex-direction:column;gap:10px;margin-top:14px;}
  @media (prefers-reduced-motion: no-preference){
    .tt-skeleton-bar,.tt-skeleton-pill{animation:tt-shimmer 1.4s ease-in-out infinite;}
    @keyframes tt-shimmer{0%{background-position:200% 0}100%{background-position:-200% 0}}
  }
`;

/** Placeholder loading untuk kartu campaign / panel — tanpa teks, murni bentuk. */
export function Skeleton({ lines = 2, showProgress = false, className }: SkeletonProps) {
  return (
    <>
      <style href="tt-skeleton" precedence="tt-ui">{SKELETON_CSS}</style>
      <div className={`tt-skeleton${className ? ` ${className}` : ""}`} aria-hidden="true">
        <div className="tt-skeleton-row">
          <div className="tt-skeleton-bar w40" />
          <div className="tt-skeleton-pill" />
        </div>
        <div className="tt-skeleton-bar w70" />
        {showProgress ? (
          <div className="tt-skeleton-meter">
            <span />
          </div>
        ) : null}
        <div className="tt-skeleton-lines">
          {Array.from({ length: Math.max(0, lines) }).map((_, i) => (
            <div key={i} className="tt-skeleton-bar w100" style={{ opacity: 1 - i * 0.22 }} />
          ))}
        </div>
      </div>
    </>
  );
}

/** Baris skeleton untuk tabel / daftar rapat. */
export function SkeletonRow({ className }: { className?: string }) {
  return (
    <>
      <style href="tt-skeleton" precedence="tt-ui">{SKELETON_CSS}</style>
      <div className={`tt-skeleton-row-item${className ? ` ${className}` : ""}`} aria-hidden="true">
        <div className="tt-skeleton-bar" style={{ width: 44, height: 44, borderRadius: 12, flex: "none" }} />
        <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 9 }}>
          <div className="tt-skeleton-bar w40" />
          <div className="tt-skeleton-bar w70" style={{ height: 10 }} />
        </div>
        <div className="tt-skeleton-pill" />
      </div>
    </>
  );
}
