import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { StatusBadge } from "./status-badge";

describe("StatusBadge", () => {
  it("renders the sentence-case label for a known status", () => {
    render(<StatusBadge status="ongoing" />);
    expect(screen.getByText("Ongoing")).toBeTruthy();
  });

  it("lets the label prop override the built-in one", () => {
    render(<StatusBadge status="ongoing" label="En curso" />);
    expect(screen.getByText("En curso")).toBeTruthy();
    expect(screen.queryByText("Ongoing")).toBeNull();
  });

  it("gives an active status and a terminal status different compiled classes", () => {
    const a = render(<StatusBadge status="ongoing" />);
    const b = render(<StatusBadge status="rejected" />);
    const elA = a.container.firstElementChild!;
    const elB = b.container.firstElementChild!;
    expect(elA.className).not.toBe(elB.className);
    expect(elA.className).not.toMatch(/bg-status-|border-status-|text-status-/);
  });

  it("marks the rendered element with data-status for a known status", () => {
    render(<StatusBadge status="hired" />);
    expect(screen.getByText("Hired").getAttribute("data-status")).toBe("hired");
  });

  it("falls back to a neutral style and the raw string for an unknown status", () => {
    render(<StatusBadge status="some-unknown-status" />);
    const el = screen.getByText("some-unknown-status");
    expect(el.getAttribute("data-status")).toBeNull();
  });

  it("keeps its data-slot hook", () => {
    render(<StatusBadge status="ongoing" />);
    expect(screen.getByText("Ongoing").getAttribute("data-slot")).toBe("status-badge");
  });
});
