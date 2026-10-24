import { describe, it, expect } from "vitest";
import { normalizeAdvisoryReport, ADVISORY_DISCLAIMER } from "../lib/advisory";

describe("advisory", () => {
  it("accepts valid output", () => {
    const r = normalizeAdvisoryReport({
      summary: "ok",
      findings: [{ label: "f1", detail: "d", severity: "warning" }],
    });
    expect(r).not.toBeNull();
    expect(r!.summary).toBe("ok");
    expect(r!.findings).toHaveLength(1);
    expect(r!.findings[0].severity).toBe("warning");
    expect(r!.disclaimer).toBe(ADVISORY_DISCLAIMER);
  });

  it("strips dangerous/extra fields and truncates", () => {
    const r = normalizeAdvisoryReport({
      summary: "x".repeat(1000),
      findings: Array.from({ length: 30 }, (_, i) => ({ label: `l${i}`, evil: "<script>" })),
      __proto__: { polluted: true },
    } as unknown);
    expect(r).not.toBeNull();
    expect(r!.summary.length).toBe(500);
    expect(r!.findings).toHaveLength(20);
    // only allowed fields present
    for (const f of r!.findings) {
      expect(Object.keys(f).sort()).toEqual(["detail", "label", "severity"]);
    }
    expect((r as Record<string, unknown>).evil).toBeUndefined();
  });

  it("handles invalid output", () => {
    expect(normalizeAdvisoryReport(null)).toBeNull();
    expect(normalizeAdvisoryReport("str")).toBeNull();
    expect(normalizeAdvisoryReport(42)).toBeNull();
    expect(normalizeAdvisoryReport({})).not.toBeNull();
  });
});
