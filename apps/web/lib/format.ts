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