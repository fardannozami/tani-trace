import { buttonStyles } from "./styles";

export type ErrorCategory =
  | "wallet-missing"
  | "wrong-network"
  | "user-rejected"
  | "contract-revert"
  | "insufficient-gas"
  | "ipfs-failed"
  | "rpc-failed"
  | "upload-auth"
  | "upload-config"
  | "unsupported-file"
  | "file-too-large"
  | "unknown";

export type FlexibleError = string | Error | { code?: string };

export interface ErrorMessageProps {
  error: FlexibleError;
  onRetry?: () => void;
}

const STANDARD_MESSAGES: Record<ErrorCategory, string> = {
  "wallet-missing": "Wallet belum terdeteksi. Pasang atau buka ekstensi wallet, lalu muat ulang halaman ini.",
  "wrong-network": "Anda tersambung ke jaringan yang salah. Pindahkan wallet ke Monad Testnet, lalu coba lagi.",
  "user-rejected": "Permintaan dibatalkan dari wallet. Tidak ada perubahan yang terjadi — Anda bisa mencoba kapan saja.",
  "contract-revert": "Kontrak menolak transaksi ini. Periksa jumlah dan status campaign, lalu sesuaikan lalu coba lagi.",
  "insufficient-gas": "Saldo MON untuk biaya jaringan tidak cukup. Ambil MON dari faucet testnet, lalu ulangi.",
  "ipfs-failed": "Unggahan ke IPFS gagal. Periksa koneksi internet Anda dan coba unggah berkas sekali lagi.",
  "rpc-failed": "Koneksi ke node jaringan terganggu. Tunggu sebentar lalu coba lagi — data Anda tidak berubah.",
  "upload-auth": "Sesi unggah tidak valid atau sudah kedaluwarsa. Muat ulang halaman lalu ulangi langkah unggah.",
  "upload-config": "Layanan unggah di server belum dikonfigurasi (IPFS/JWT belum tersedia). Hubungi maintainer aplikasi.",
  "unsupported-file": "Format berkas tidak didukung. Gunakan JPG, PNG, PDF, atau JSON.",
  "file-too-large": "Ukuran berkas melebihi batas. Maksimal 4 MB per berkas dan 8 MB untuk seluruh bundel.",
  unknown: "Terjadi kendala yang belum dikenali. Coba lagi; bila berlanjut, muat ulang halaman.",
};

/** Pesan error dari kode API unggah diprioritaskan sebelum aturan umum. */
const UPLOAD_CODES: Array<[RegExp, ErrorCategory]> = [
  [/upload_not_configured|pinata_jwt|not_configured/, "upload-config"],
  [/invalid_nonce|invalid_token|invalid_signature|unauthorized|nonce failed/, "upload-auth"],
  [/unsupported_media_type|bad-mime/, "unsupported-file"],
  [/payload_too_large|file-too-large|bundle-too-large/, "file-too-large"],
];

/** Classify a flexible error into a known category with an actionable Indonesian message. */
export function classifyError(error: FlexibleError): ErrorCategory {
  const code = typeof error === "string" ? error : error instanceof Error ? error.message : error.code ?? "";
  const extra = typeof error === "object" && !(error instanceof Error) ? ` ${JSON.stringify(error)}` : "";
  const text = (code + extra).toLowerCase();
  for (const [pattern, category] of UPLOAD_CODES) if (pattern.test(text)) return category;
  if (/user rejected|rejected the request|user denied|4001/.test(text)) return "user-rejected";
  if (/no wallet|wallet (?:is )?not (?:installed|detected|available)|connector not found|no provider|metamask not installed/.test(text)) return "wallet-missing";
  if (/wrong.?network|unsupported chain|chain.?mismatch|switch (?:the )?chain|invalid chain|chain ?id/.test(text)) return "wrong-network";
  if (/insufficient|intrinsic gas|gas required exceeds|out of gas/.test(text)) return "insufficient-gas";
  if (/revert|execution reverted|custom error/.test(text)) return "contract-revert";
  if (/ipfs|upload|pin file|multipart/.test(text)) return "ipfs-failed";
  if (/rpc|timeout|failed to fetch|network error|econnrefused|http request failed|502|503/.test(text)) return "rpc-failed";
  return "unknown";
}

/** Standard actionable Indonesian message for a category. */
export function getErrorMessage(error: FlexibleError): { category: ErrorCategory; message: string } {
  const category = classifyError(error);
  const raw = typeof error === "string" ? error : error instanceof Error ? error.message : error.code ?? "";
  // Kalimat yang memang ditulis manusia (mis. "Pilih berkas bukti.") ditampilkan
  // apa adanya, bukan diganti pesan generik.
  if (category === "unknown" && raw && /\s/.test(raw) && !/^[A-Za-z0-9_-]+$/.test(raw)) {
    return { category, message: raw };
  }
  return { category, message: STANDARD_MESSAGES[category] };
}

const TITLES: Record<ErrorCategory, string> = {
  "wallet-missing": "Wallet tidak ditemukan",
  "wrong-network": "Jaringan belum sesuai",
  "user-rejected": "Dibatalkan",
  "contract-revert": "Transaksi ditolak kontrak",
  "insufficient-gas": "Biaya jaringan kurang",
  "ipfs-failed": "Gagal unggah ke IPFS",
  "rpc-failed": "Koneksi jaringan terganggu",
  "upload-auth": "Sesi unggah tidak valid",
  "upload-config": "Layanan unggah belum siap",
  "unsupported-file": "Berkas tidak didukung",
  "file-too-large": "Berkas terlalu besar",
  unknown: "Terjadi kendala",
};

const RETRYABLE: ErrorCategory[] = ["wrong-network", "contract-revert", "insufficient-gas", "ipfs-failed", "rpc-failed", "upload-auth", "unknown", "wallet-missing"];

export function ErrorMessage({ error, onRetry }: ErrorMessageProps) {
  const { category, message } = getErrorMessage(error);
  const showRetry = !!onRetry && RETRYABLE.includes(category);
  return (
    <>
      <style href="tt-buttons" precedence="tt-ui">{buttonStyles}</style>
      <style href="tt-error-message" precedence="tt-ui">{`
        .tt-error{display:flex;gap:12px;align-items:flex-start;padding:16px 18px;background:var(--danger-soft);border:1px solid rgba(150,57,44,.25);border-radius:14px;}
        .tt-error-icon{flex:none;width:24px;height:24px;border-radius:50%;background:var(--danger);color:#fff;display:grid;place-items:center;margin-top:1px;}
        .tt-error-body{min-width:0;}
        .tt-error-title{margin:0 0 4px;font:700 15px 'Space Grotesk',sans-serif;color:var(--danger);}
        .tt-error-msg{margin:0;font-size:14px;line-height:1.6;color:var(--ink);}
        .tt-error .tt-button{margin-top:12px;}
      `}</style>
      <div role="alert" className="tt-error">
        <span className="tt-error-icon" aria-hidden="true">
          <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round"><path d="M12 6.5v7M12 17.5v.01"/></svg>
        </span>
        <div className="tt-error-body">
          <p className="tt-error-title">{TITLES[category]}</p>
          <p className="tt-error-msg">{message}</p>
          {showRetry ? (
            <button type="button" className="tt-button tt-button-primary" onClick={onRetry}>
              Coba lagi
            </button>
          ) : null}
        </div>
      </div>
    </>
  );
}
