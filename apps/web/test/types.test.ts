import { describe, it, expect } from "vitest";
import {
  CampaignStatus,
  RequestStatus,
  availableEscrow,
  quorumRequired,
  totalVoted,
} from "../lib/types";

describe("types", () => {
  it("availableEscrow", () => {
    expect(availableEscrow({ totalRaised: 100n, releasedTotal: 30n })).toBe(70n);
  });
  it("quorumRequired cases", () => {
    expect(quorumRequired(0n)).toBe(0n);
    expect(quorumRequired(1n)).toBe(1n);
    expect(quorumRequired(100n)).toBe(50n);
    expect(quorumRequired(99n)).toBe(50n);
    expect(quorumRequired(3n)).toBe(2n);
  });
  it("totalVoted", () => {
    expect(totalVoted({ yesWeight: 10n, noWeight: 5n })).toBe(15n);
  });
  it("CampaignStatus enum values", () => {
    expect(CampaignStatus.FUNDING).toBe(0);
    expect(CampaignStatus.ACTIVE).toBe(1);
    expect(CampaignStatus.FAILED).toBe(2);
    expect(CampaignStatus.COMPLETED).toBe(3);
  });
  it("RequestStatus enum values", () => {
    expect(RequestStatus.PENDING).toBe(0);
    expect(RequestStatus.APPROVED).toBe(1);
    expect(RequestStatus.REJECTED).toBe(2);
    expect(RequestStatus.EXPIRED).toBe(3);
    expect(RequestStatus.PAID).toBe(4);
  });
});
