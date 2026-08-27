import { RelativeDatePipe } from "./relative-date.pipe";

describe("RelativeDatePipe", () => {
  const pipe = new RelativeDatePipe();
  pipe.now = () => new Date("2026-08-26T12:00:00Z");

  it("says today for the same day", () => {
    expect(pipe.transform("2026-08-26T08:00:00Z")).toBe("today");
  });

  it("says yesterday", () => {
    expect(pipe.transform("2026-08-25T12:00:00Z")).toBe("yesterday");
  });

  it("counts days within a month", () => {
    expect(pipe.transform("2026-08-20T12:00:00Z")).toBe("6 days ago");
  });

  it("falls back to a short date after 30 days", () => {
    expect(pipe.transform("2026-06-01T12:00:00Z")).toBe("Jun 1, 2026");
  });

  it("accepts Date objects", () => {
    expect(pipe.transform(new Date("2026-08-25T12:00:00Z"))).toBe("yesterday");
  });
});
