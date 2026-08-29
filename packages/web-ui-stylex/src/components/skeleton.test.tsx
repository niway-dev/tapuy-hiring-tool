import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Skeleton } from "./skeleton";

describe("Skeleton", () => {
  it("renders with compiled StyleX classes", () => {
    const { container } = render(<Skeleton />);
    const el = container.firstElementChild as HTMLElement;
    expect(el.className.length).toBeGreaterThan(0);
    expect(el.className).not.toMatch(/animate-pulse|bg-/);
  });

  it("keeps its data-slot hook", () => {
    const { container } = render(<Skeleton />);
    expect(container.firstElementChild?.getAttribute("data-slot")).toBe("skeleton");
  });
});
