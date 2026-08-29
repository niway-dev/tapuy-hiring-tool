import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Textarea } from "./textarea";

describe("Textarea", () => {
  it("renders with compiled classes and no Tailwind strings", () => {
    render(<Textarea placeholder="Notes" />);
    const el = screen.getByPlaceholderText("Notes");
    expect(el.tagName).toBe("TEXTAREA");
    expect(el.className.length).toBeGreaterThan(0);
    expect(el.className).not.toMatch(/bg-surface-2|rounded-md|border-border/);
  });

  it("applies an invalid style when aria-invalid is set", () => {
    render(<Textarea placeholder="A" />);
    render(<Textarea placeholder="B" aria-invalid />);
    const plain = screen.getByPlaceholderText("A");
    const invalid = screen.getByPlaceholderText("B");
    expect(invalid.className).not.toBe(plain.className);
  });
});
