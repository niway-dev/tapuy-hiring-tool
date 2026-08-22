import { describe, expect, it } from "vitest";
import {
  CLOSED_STATUSES,
  HIRING_PROCESS_STATUS_INFO,
  HIRING_PROCESS_STATUS_ORDER,
  HIRING_PROCESS_STATUS_VALUES,
  OPEN_STATUSES,
  STATUS_TRANSITIONS,
  statusPipelineIndex,
} from "../constants/hiring-process-status";

describe("pipeline order", () => {
  it("orders the 8 statuses open-first, then terminal", () => {
    expect(HIRING_PROCESS_STATUS_ORDER).toEqual([
      "first-contact",
      "ongoing",
      "on-hold",
      "offer-made",
      "offer-accepted",
      "hired",
      "rejected",
      "dropped-out",
    ]);
  });

  it("covers exactly the same set as the enum values", () => {
    expect([...HIRING_PROCESS_STATUS_ORDER].sort()).toEqual(
      [...HIRING_PROCESS_STATUS_VALUES].sort(),
    );
  });

  it("OPEN/CLOSED match the existing category metadata", () => {
    for (const status of OPEN_STATUSES) {
      expect(HIRING_PROCESS_STATUS_INFO[status].category).toBe("active");
    }
    for (const status of CLOSED_STATUSES) {
      expect(HIRING_PROCESS_STATUS_INFO[status].category).toBe("terminal");
    }
    expect(OPEN_STATUSES).toHaveLength(4);
    expect(CLOSED_STATUSES).toHaveLength(4);
  });

  it("statusPipelineIndex is the sort comparator for the Status column", () => {
    expect(statusPipelineIndex("first-contact")).toBe(0);
    expect(statusPipelineIndex("dropped-out")).toBe(7);
    expect(statusPipelineIndex("offer-made")).toBeLessThan(statusPipelineIndex("hired"));
  });

  it("offer-made is no longer a dead end (transitions bug fix)", () => {
    expect(STATUS_TRANSITIONS["offer-made"]).toContain("offer-accepted");
    expect(STATUS_TRANSITIONS["offer-made"]).toContain("rejected");
  });
});
