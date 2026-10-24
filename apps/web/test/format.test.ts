import { describe, it, expect } from "vitest";
import { formatTani, formatTaniRaw, formatDate, formatAddress } from "../lib/format";

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
