import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Input } from "./input";

describe("Input", () => {
  it("renders with compiled classes and no Tailwind strings", () => {
    render(<Input placeholder="Email" />);
    const el = screen.getByPlaceholderText("Email");
    expect(el.className.length).toBeGreaterThan(0);
    expect(el.className).not.toMatch(/bg-surface-2|rounded-md|border-border/);
  });

  it("applies an invalid style when aria-invalid is set", () => {
    render(<Input placeholder="A" />);
    render(<Input placeholder="B" aria-invalid />);
    const plain = screen.getByPlaceholderText("A");
    const invalid = screen.getByPlaceholderText("B");
    expect(invalid.className).not.toBe(plain.className);
  });
});
