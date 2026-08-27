import { MoneyPipe } from "./money.pipe";

describe("MoneyPipe", () => {
  const pipe = new MoneyPipe();

  it("returns a dash when salary is null or undefined", () => {
    expect(pipe.transform(null, "USD", "monthly")).toBe("—");
    expect(pipe.transform(undefined, "USD", "monthly")).toBe("—");
  });

  it("formats USD monthly", () => {
    expect(pipe.transform(3500, "USD", "monthly")).toBe("$3,500 / mo");
  });

  it("formats PEN hourly", () => {
    expect(pipe.transform(45, "PEN", "hourly")).toBe("S/ 45 / hr");
  });

  it("omits the rate suffix when rate type is missing", () => {
    expect(pipe.transform(100, "USD", undefined)).toBe("$100");
  });
});
