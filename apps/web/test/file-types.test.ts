import { describe, it, expect } from "vitest";
import {
  evidenceMimeType,
  isInspectableEvidenceMime,
  MAX_UPLOAD_BYTES,
  MAX_BUNDLE_BYTES,
} from "../lib/file-types";

describe("file-types", () => {
  it("detects image/jpeg from .jpg", () => {
    expect(evidenceMimeType({ name: "photo.jpg" })).toBe("image/jpeg");
  });
  it("detects image/jpeg from .jpeg", () => {
    expect(evidenceMimeType({ name: "photo.jpeg" })).toBe("image/jpeg");
  });
  it("detects image/png from .png", () => {
    expect(evidenceMimeType({ name: "photo.png" })).toBe("image/png");
  });
  it("detects application/pdf from .pdf", () => {
    expect(evidenceMimeType({ name: "doc.pdf" })).toBe("application/pdf");
  });
  it("detects application/json from .json", () => {
    expect(evidenceMimeType({ name: "data.json" })).toBe("application/json");
  });
  it("rejects exe/txt/zip", () => {
    expect(evidenceMimeType({ name: "a.exe" })).toBeNull();
    expect(evidenceMimeType({ name: "a.txt" })).toBeNull();
    expect(evidenceMimeType({ name: "a.zip" })).toBeNull();
  });
  it("isInspectableEvidenceMime", () => {
    expect(isInspectableEvidenceMime("image/jpeg")).toBe(true);
    expect(isInspectableEvidenceMime("image/png")).toBe(true);
    expect(isInspectableEvidenceMime("application/pdf")).toBe(true);
    expect(isInspectableEvidenceMime("application/json")).toBe(false);
  });
  it("MAX_UPLOAD_BYTES and MAX_BUNDLE_BYTES", () => {
    expect(MAX_UPLOAD_BYTES).toBe(4194304);
    expect(MAX_BUNDLE_BYTES).toBe(8388608);
  });
});
