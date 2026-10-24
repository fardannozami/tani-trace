"use client";
import { useCallback } from "react";
import { useWalletClient } from "wagmi";
import { evidenceMimeType, MAX_UPLOAD_BYTES, MAX_BUNDLE_BYTES } from "../lib/file-types";
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
    if (!mime) throw new Error("bad-mime");
    if (file.size > MAX_UPLOAD_BYTES) throw new Error("file-too-large");
    const { nonce, token } = await getNonce(walletClient.account.address);
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
    const res = await fetch("/api/upload", { method: "POST", body: form });
    const data = await res.json();
    if (!res.ok) throw new Error(data?.error || "upload failed");
    return data.cid as string;
  }, [walletClient, getNonce]);

  const runAdvisory = useCallback(async (files: File[], purpose: string, notes?: string) => {
    if (!walletClient?.account) return null;
    try {
      // upload files first not here; advisory expects already? spec: call after file upload. We'll just send metadata.
      const { nonce, token } = await getNonce(walletClient.account.address);
      const totalSize = files.reduce((a, f) => a + f.size, 0);
      const message = `TaniTrace advisory\nnonce:${nonce}\ntoken:${token}\nsize:${totalSize}`;
      const signature = await walletClient.signMessage({ message });
      const form = new FormData();
      files.forEach((f) => form.append("files", f));
      form.append("address", walletClient.account.address);
      form.append("nonce", nonce);
      form.append("token", token);
      form.append("signature", signature);
      form.append("purpose", purpose);
      if (notes) form.append("notes", notes);
      const res = await fetch("/api/evidence/advisory", { method: "POST", body: form });
      const data = await res.json();
      if (!res.ok) return null;
      return normalizeAdvisoryReport(data?.report ?? data);
    } catch {
      return null;
    }
  }, [walletClient, getNonce]);

  const uploadManifest = useCallback(async (manifest: EvidenceManifest) => {
    if (!walletClient?.account) throw new Error("wallet-missing");
    const { nonce, token } = await getNonce(walletClient.account.address);
    const body = serializeManifest(manifest);
    const message = `TaniTrace manifest\nnonce:${nonce}\ntoken:${token}\nsize:${body.length}`;
    const signature = await walletClient.signMessage({ message });
    const res = await fetch("/api/upload/manifest", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ address: walletClient.account.address, nonce, token, signature, manifest }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data?.error || "manifest upload failed");
    return data.cid as string;
  }, [walletClient, getNonce]);

  const uploadBundle = useCallback(async (files: File[], purpose: string, notes?: string) => {
    const total = files.reduce((a, f) => a + f.size, 0);
    if (total > MAX_BUNDLE_BYTES) throw new Error("bundle-too-large");
    const cids = await Promise.all(files.map((f) => uploadFile(f)));
    const advisory = await runAdvisory(files, purpose, notes);
    return { fileCids: cids, advisory };
  }, [uploadFile, runAdvisory]);

  return { uploadFile, uploadManifest, runAdvisory, uploadBundle, getNonce };
}