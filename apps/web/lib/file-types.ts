export const EVIDENCE_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "application/pdf",
  "application/json",
] as const;

export type EvidenceMime = (typeof EVIDENCE_MIME_TYPES)[number];

export const MAX_UPLOAD_BYTES = 4 * 1024 * 1024;
export const MAX_BUNDLE_BYTES = 8 * 1024 * 1024;

const EXT_TO_MIME: Record<string, EvidenceMime> = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".pdf": "application/pdf",
  ".json": "application/json",
};

export function evidenceMimeType(file: { name?: string; type?: string }): EvidenceMime | null {
  const t = (file.type || "").toLowerCase();
  if (EVIDENCE_MIME_TYPES.includes(t as EvidenceMime)) return t as EvidenceMime;
  const name = (file.name || "").toLowerCase();
  const dot = name.lastIndexOf(".");
  if (dot >= 0) {
    const ext = name.slice(dot);
    if (ext in EXT_TO_MIME) return EXT_TO_MIME[ext];
  }
  return null;
}

export function isInspectableEvidenceMime(mime: string): boolean {
  return mime === "image/jpeg" || mime === "image/png" || mime === "application/pdf";
}