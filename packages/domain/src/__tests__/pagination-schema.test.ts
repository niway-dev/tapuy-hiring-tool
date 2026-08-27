import { describe, expect, it } from "vitest";
import { hiringProcessQuerySchema } from "../schemas/pagination";

describe("hiringProcessQuerySchema.statuses", () => {
  it("accepts an array", () => {
    const result = hiringProcessQuerySchema.parse({ statuses: ["ongoing", "hired"] });
    expect(result.statuses).toEqual(["ongoing", "hired"]);
  });

  it("wraps a single string into an array", () => {
    const result = hiringProcessQuerySchema.parse({ statuses: "ongoing" });
    expect(result.statuses).toEqual(["ongoing"]);
  });

  it("rejects an unknown status", () => {
    expect(() => hiringProcessQuerySchema.parse({ statuses: "bogus" })).toThrow();
  });

  it("leaves statuses undefined when absent", () => {
    expect(hiringProcessQuerySchema.parse({}).statuses).toBeUndefined();
  });
});
