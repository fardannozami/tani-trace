"use client";
import { useEffect, useState } from "react";

/**
 * Waktu sekarang (detik UNIX), atau `null` sebelum komponen ter-mount.
 * Nilai awal `null` penting: `Date.now()` di server dan klien berbeda, dan
 * selisih itu memicu hydration mismatch pada teks hitung mundur.
 */
export function useNowSeconds(): number | null {
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    setNow(Math.floor(Date.now() / 1000));
    const id = setInterval(() => setNow(Math.floor(Date.now() / 1000)), 1000);
    return () => clearInterval(id);
  }, []);
  return now;
}
