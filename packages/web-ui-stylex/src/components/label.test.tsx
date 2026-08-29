import { render, screen } from "@testing-library/react";
import * as stylex from "@stylexjs/stylex";
import { describe, expect, it } from "vitest";
import { Label } from "./label";

const extra = stylex.create({ red: { color: "rgb(255, 0, 0)" } });

describe("Label", () => {
  it("renders its children and keeps the data-slot hook", () => {
    render(<Label>Email</Label>);
    const el = screen.getByText("Email");
    expect(el.getAttribute("data-slot")).toBe("label");
  });

  it("compiles to StyleX classes rather than Tailwind strings", () => {
    render(<Label>Email</Label>);
    const el = screen.getByText("Email");
    expect(el.className.length).toBeGreaterThan(0);
    expect(el.className).not.toMatch(/text-text-secondary|flex|items-center/);
  });

  it("merges a caller's style after its own", () => {
    render(<Label style={extra.red}>Email</Label>);
    const el = screen.getByText("Email");
    const own = render(<Label>Other</Label>);
    expect(el.className).not.toBe(own.container.firstElementChild?.className);
  });
});
