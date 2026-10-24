import { describe, it, expect } from "vitest";
import { formatTani, formatTaniRaw, formatDate, formatAddress, parseTani, countdown } from "../lib/format";
import { getStatusMeta } from "../lib/status";

describe("format", () => {
  it("formatTani 1e18", () => {
    expect(formatTani(10n ** 18n)).toBe("1");
  });
  it("formatTaniRaw", () => {
    expect(formatTaniRaw(10n ** 18n)).toBe("1");
  });
  it("formatAddress shortens", () => {
    expect(formatAddress("0x1234567890abcdef")).toBe("0x1234...cdef");
  });
  it("formatDate bigint", () => {
    expect(formatDate(1700000000n)).toBe("15/11/2023, 05.13.20");
  });
  it("formatTani zero", () => {
    expect(formatTani(0n)).toBe("0");
  });
});

describe("parseTani", () => {
  it("mengubah input desimal menjadi wei", () => {
    expect(parseTani("1")).toBe(10n ** 18n);
    expect(parseTani("0.5")).toBe(5n * 10n ** 17n);
  });
  it("mengembalikan null untuk input tidak valid", () => {
    expect(parseTani("")).toBeNull();
    expect(parseTani("abc")).toBeNull();
    expect(parseTani("0")).toBeNull();
    expect(parseTani("-1")).toBeNull();
  });
});

describe("countdown", () => {
  it("format jam dan menit", () => {
    expect(countdown(2 * 3600 + 5 * 60)).toBe("2 jam 5 menit lagi");
  });
  it("format hari", () => {
    expect(countdown(2 * 86400)).toBe("2 hari lagi");
  });
  it("waktu habis", () => {
    expect(countdown(0)).toBe("waktu habis");
    expect(countdown(30)).toBe("kurang dari 1 menit");
  });
});

describe("getStatusMeta", () => {
  it("FUNDING setelah deadline tampil menunggu finalisasi", () => {
    expect(getStatusMeta(0, "campaign", true).label).toBe("Menunggu finalisasi");
    expect(getStatusMeta("FUNDING", "campaign", true).label).toBe("Menunggu finalisasi");
  });
  it("FUNDING sebelum deadline tetap pendanaan berjalan", () => {
    expect(getStatusMeta(0, "campaign", false).label).toBe("Pendanaan berjalan");
  });
  it("status lain tidak berubah", () => {
    expect(getStatusMeta(2, "campaign", true).label).toBe("Gagal");
    expect(getStatusMeta(0, "request", true).label).toBe("Menunggu voting");
  });
});
