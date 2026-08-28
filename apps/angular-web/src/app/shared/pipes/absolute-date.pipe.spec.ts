import { AbsoluteDatePipe } from "./absolute-date.pipe";

describe("AbsoluteDatePipe", () => {
  const pipe = new AbsoluteDatePipe();
  const iso = "2026-08-20T09:20:00.000Z";

  it("formats date and time together by default", () => {
    expect(pipe.transform(iso)).toBe("Aug 20, 2026 · 9:20 AM");
  });

  it("formats only the date when asked", () => {
    expect(pipe.transform(iso, "date")).toBe("Aug 20, 2026");
  });

  it("formats only the time when asked", () => {
    expect(pipe.transform(iso, "time")).toBe("9:20 AM");
  });

  it("accepts a Date object", () => {
    expect(pipe.transform(new Date(iso), "date")).toBe("Aug 20, 2026");
  });

  it("returns a dash for null or undefined", () => {
    expect(pipe.transform(null)).toBe("—");
    expect(pipe.transform(undefined)).toBe("—");
  });
});
