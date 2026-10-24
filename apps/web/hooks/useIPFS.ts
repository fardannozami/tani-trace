"use client";
import { useCallback } from "react";
import { useWalletClient } from "wagmi";
import { evidenceMimeType, isInspectableEvidenceMime, MAX_UPLOAD_BYTES, MAX_BUNDLE_BYTES } from "../lib/file-types";
import { serializeManifest, type EvidenceManifest } from "../lib/manifest";
import { normalizeAdvisoryReport } from "../lib/advisory";

export { MAX_UPLOAD_BYTES, MAX_BUNDLE_BYTES };

export function useIPFS() {
  const { data: walletClient } = useWalletClient();

  const getNonce = useCallback(async (address: string) => {
    const res = await fetch("/api/upload/nonce", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ address }) });
    if (!res.ok) throw new Error("nonce failed");
    return res.json() as Promise<{ nonce: string; token: string; expiresAt: number }>;
  }, []);

  const uploadFile = useCallback(async (file: File) => {
    if (!walletClient?.account) throw new Error("wallet-missing");
    const mime = evidenceMimeType(file);
    if (!mime) throw new Error("unsupported_media_type");
    if (file.size > MAX_UPLOAD_BYTES) throw new Error("payload_too_large");
    const { nonce, token, expiresAt } = await getNonce(walletClient.account.address);
    const message = `TaniTrace upload\nnonce:${nonce}\ntoken:${token}\nsize:${file.size}\nname:${file.name}`;
    const signature = await walletClient.signMessage({ message });
    const form = new FormData();
    form.append("file", file);
    form.append("address", walletClient.account.address);
    form.append("nonce", nonce);
    form.append("token", token);
    form.append("signature", signature);
    form.append("size", String(file.size));
    form.append("name", file.name);
    form.append("expiresAt", String(expiresAt));
    const res = await fetch("/api/upload", { method: "POST", body: form });
    const data = await res.json();
    if (!res.ok) throw new Error(data?.error || "upload failed");
    return data.cid as string;
  }, [walletClient, getNonce]);

  const runAdvisory = useCallback(async (files: File[], purpose: string, notes?: string) => {
    if (!walletClient?.account) return { report: null, error: "Hubungkan wallet untuk menjalankan pemeriksaan AI." };
    try {
      const { nonce, token, expiresAt } = await getNonce(walletClient.account.address);
      const totalSize = files.reduce((a, f) => a + f.size, 0);
      const message = `TaniTrace advisory\nnonce:${nonce}\ntoken:${token}\nsize:${totalSize}`;
      const signature = await walletClient.signMessage({ message });
      const form = new FormData();
      files.forEach((f) => form.append("files", f));
      form.append("address", walletClient.account.address);
      form.append("nonce", nonce);
      form.append("token", token);
      form.append("signature", signature);
      form.append("expiresAt", String(expiresAt));
      form.append("purpose", purpose);
      if (notes) form.append("notes", notes);
      const res = await fetch("/api/evidence/advisory", { method: "POST", body: form });
      const data = await res.json();
      if (!res.ok || data?.error) {
        const errors: Record<string, string> = {
          AI_NOT_CONFIGURED: "Pemeriksaan AI belum dikonfigurasi di server.",
          AI_FAILED: "Layanan AI gagal menganalisis berkas. Berkas tetap berhasil diunggah.",
          RATE_LIMITED: "Batas pemeriksaan AI tercapai. Coba lagi dalam beberapa menit.",
          BAD_MIME: "Pemeriksaan AI hanya mendukung JPG, PNG, dan PDF.",
          BAD_PURPOSE: "Isi tujuan pencairan sebelum memeriksa berkas.",
          BAD_FILE_COUNT: "Pemeriksaan AI menerima maksimal 4 berkas sekaligus.",
          FILE_TOO_LARGE: "Ukuran berkas untuk pemeriksaan AI maksimal 4 MB per berkas.",
          BUNDLE_TOO_LARGE: "Ukuran total berkas untuk pemeriksaan AI maksimal 8 MB.",
        };
        const code = typeof data?.error === "string" ? data.error : "";
        return { report: null, error: errors[code] ?? `Pemeriksaan AI gagal (${code || res.status}). Berkas tetap berhasil diunggah.` };
      }
      const report = normalizeAdvisoryReport(data?.report);
      return report
        ? { report, error: null }
        : { report: null, error: "AI tidak mengembalikan hasil pemeriksaan yang dapat ditampilkan." };
    } catch (error) {
      const detail = error instanceof Error ? error.message : "koneksi ke layanan AI gagal";
      return { report: null, error: `Pemeriksaan AI tidak tersedia: ${detail}. Berkas tetap berhasil diunggah.` };
    }
  }, [walletClient, getNonce]);

  const uploadManifest = useCallback(async (manifest: EvidenceManifest) => {
    if (!walletClient?.account) throw new Error("wallet-missing");
    const { nonce, token, expiresAt } = await getNonce(walletClient.account.address);
    const body = serializeManifest(manifest);
    const message = `TaniTrace manifest\nnonce:${nonce}\ntoken:${token}\nsize:${body.length}`;
    const signature = await walletClient.signMessage({ message });
    const res = await fetch("/api/upload/manifest", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ address: walletClient.account.address, nonce, token, signature, expiresAt, manifest }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data?.error || "manifest upload failed");
    return data.cid as string;
  }, [walletClient, getNonce]);

  const uploadBundle = useCallback(async (files: File[], purpose: string, notes?: string) => {
    const total = files.reduce((a, f) => a + f.size, 0);
    if (total > MAX_BUNDLE_BYTES) throw new Error("bundle-too-large");
    const cids = await Promise.all(files.map((f) => uploadFile(f)));
    const inspectableFiles = files.filter((file) => {
      const mime = evidenceMimeType(file);
      return mime !== null && isInspectableEvidenceMime(mime);
    });
    if (inspectableFiles.length === 0) {
      return {
        fileCids: cids,
        advisory: null,
        advisoryError: "Berkas berhasil diunggah. Pemeriksaan AI hanya mendukung JPG, PNG, dan PDF.",
      };
    }
    if (inspectableFiles.length > 4) {
      return {
        fileCids: cids,
        advisory: null,
        advisoryError: "Berkas berhasil diunggah. Pemeriksaan AI hanya dapat memeriksa maksimal 4 berkas sekaligus.",
      };
    }
    const result = await runAdvisory(inspectableFiles, purpose, notes);
    return { fileCids: cids, advisory: result.report, advisoryError: result.error };
  }, [uploadFile, runAdvisory]);

  return { uploadFile, uploadManifest, runAdvisory, uploadBundle, getNonce };
}
