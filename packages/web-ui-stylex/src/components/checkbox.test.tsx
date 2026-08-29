import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Checkbox } from "./checkbox";

describe("Checkbox", () => {
  it("renders with compiled classes and no Tailwind strings", () => {
    const { container } = render(<Checkbox />);
    const el = container.querySelector('[data-slot="checkbox"]') as HTMLElement;
    expect(el).not.toBeNull();
    expect(el.className.length).toBeGreaterThan(0);
    expect(el.className).not.toMatch(/border-|size-|ring-/);
  });

  it("applies an invalid style when aria-invalid is set", () => {
    const a = render(<Checkbox />);
    const b = render(<Checkbox aria-invalid />);
    const elA = a.container.querySelector('[data-slot="checkbox"]')!;
    const elB = b.container.querySelector('[data-slot="checkbox"]')!;
    expect(elB.className).not.toBe(elA.className);
  });
});
