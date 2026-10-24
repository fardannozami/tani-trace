import { formatUnits } from "viem";

export function formatTani(value: bigint, decimals = 18): string {
  const s = formatUnits(value, decimals);
  const num = Number(s);
  if (!Number.isFinite(num)) return s;
  return num.toLocaleString("id-ID", { maximumFractionDigits: 4 });
}

export function formatTaniRaw(value: bigint, decimals = 18): string {
  return formatUnits(value, decimals);
}

export function formatDate(ts: bigint | number): string {
  const ms = typeof ts === "bigint" ? Number(ts) * 1000 : ts * 1000;
  if (!Number.isFinite(ms)) return "-";
  // Zona waktu dipatok agar output server dan browser selalu sama
  // (mencegah hydration mismatch).
  return new Date(ms).toLocaleString("id-ID", { timeZone: "Asia/Jakarta" });
}

export function formatAddress(addr: string): string {
  if (!addr || addr.length < 10) return addr;
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
}

/**
 * Ubah input user (dalam TNC) menjadi wei. Mengembalikan null bila input
 * tidak valid, sehingga UI bisa menampilkan pesan error alih-alih melempar.
 */
export function parseTani(value: string): bigint | null {
  if (!value) return null;
  const n = Number(value);
  if (!Number.isFinite(n) || n <= 0) return null;
  const wei = BigInt(Math.round(n * 1e18));
  return wei > 0n ? wei : null;
}

/** Sisa waktu dalam bahasa manusia, mis. "2 jam 5 menit lagi". */
export function countdown(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds <= 0) return "waktu habis";
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const parts: string[] = [];
  if (days > 0) parts.push(`${days} hari`);
  if (hours > 0) parts.push(`${hours} jam`);
  if (minutes > 0 && days === 0) parts.push(`${minutes} menit`);
  if (parts.length === 0) return "kurang dari 1 menit";
  return `${parts.join(" ")} lagi`;
}