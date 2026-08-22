import { describe, expect, it } from "vitest";
import { ARCHIVE_REASON_VALUES, isValidArchiveReason } from "../constants/archive-reason";

describe("archive reasons", () => {
  it("exposes the four reasons in dialog order", () => {
    expect(ARCHIVE_REASON_VALUES).toEqual(["no-reply", "they-passed", "i-withdrew", "role-closed"]);
  });

  it("validates values", () => {
    expect(isValidArchiveReason("no-reply")).toBe(true);
    expect(isValidArchiveReason("ghosted")).toBe(false);
  });
});
