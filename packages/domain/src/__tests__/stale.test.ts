import { describe, expect, it } from "vitest";
import { formatAge, isStaleProcess, STALE_DAYS, staleCutoff } from "../constants/stale";

const NOW = new Date("2026-08-23T12:00:00Z");
const daysAgo = (n: number) => new Date(NOW.getTime() - n * 24 * 60 * 60 * 1000);

describe("formatAge", () => {
  it("same day is 'today'", () => {
    expect(formatAge(new Date("2026-08-23T01:00:00Z"), NOW)).toBe("today");
  });
  it("days under a month", () => {
    expect(formatAge(daysAgo(4), NOW)).toBe("4d");
    expect(formatAge(daysAgo(29), NOW)).toBe("29d");
  });
  it("months under a year", () => {
    expect(formatAge(daysAgo(30), NOW)).toBe("1mo");
    expect(formatAge(daysAgo(65), NOW)).toBe("2mo");
    expect(formatAge(daysAgo(359), NOW)).toBe("11mo");
  });
  it("a year and beyond never renders '0y'", () => {
    expect(formatAge(daysAgo(360), NOW)).toBe("1y");
    expect(formatAge(daysAgo(800), NOW)).toBe("2y");
  });
  it("future dates clamp to 'today'", () => {
    expect(formatAge(daysAgo(-3), NOW)).toBe("today");
  });
});

describe("isStaleProcess", () => {
  it("open status older than 45 days is stale", () => {
    expect(isStaleProcess({ status: "ongoing", updatedAt: daysAgo(46) }, NOW)).toBe(true);
  });
  it("exactly 45 days is NOT stale (strict >)", () => {
    expect(isStaleProcess({ status: "ongoing", updatedAt: daysAgo(45) }, NOW)).toBe(false);
  });
  it("terminal statuses are never stale", () => {
    expect(isStaleProcess({ status: "hired", updatedAt: daysAgo(400) }, NOW)).toBe(false);
    expect(isStaleProcess({ status: "rejected", updatedAt: daysAgo(400) }, NOW)).toBe(false);
  });
  it("archived processes are never stale", () => {
    expect(
      isStaleProcess({ status: "ongoing", updatedAt: daysAgo(90), archivedAt: daysAgo(10) }, NOW),
    ).toBe(false);
  });
});

describe("staleCutoff", () => {
  it("is exactly STALE_DAYS before now", () => {
    expect(staleCutoff(NOW).getTime()).toBe(NOW.getTime() - STALE_DAYS * 24 * 60 * 60 * 1000);
  });
});
