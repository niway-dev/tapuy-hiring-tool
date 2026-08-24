import { describe, expect, it, vi } from "vitest";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithProviders } from "@/test/render";
import { ScopeSegment } from "./scope-segment";

describe("ScopeSegment", () => {
  it("shows both scopes with their counts", async () => {
    await renderWithProviders(
      <ScopeSegment scope="active" activeCount={12} archivedCount={5} onChange={vi.fn()} />,
    );

    expect(screen.getByRole("button", { name: "Active 12" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Archived 5" })).toBeTruthy();
  });

  it("marks the current scope as pressed", async () => {
    await renderWithProviders(
      <ScopeSegment scope="archived" activeCount={12} archivedCount={5} onChange={vi.fn()} />,
    );

    expect(screen.getByRole("button", { name: "Archived 5" }).getAttribute("aria-pressed")).toBe(
      "true",
    );
    expect(screen.getByRole("button", { name: "Active 12" }).getAttribute("aria-pressed")).toBe(
      "false",
    );
  });

  it("renders without counts before they arrive", async () => {
    await renderWithProviders(<ScopeSegment scope="active" onChange={vi.fn()} />);

    expect(screen.getByRole("button", { name: "Active" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Archived" })).toBeTruthy();
  });

  it("switches scope", async () => {
    const onChange = vi.fn();
    await renderWithProviders(
      <ScopeSegment scope="active" activeCount={12} archivedCount={5} onChange={onChange} />,
    );

    await userEvent.click(screen.getByRole("button", { name: "Archived 5" }));

    expect(onChange).toHaveBeenCalledWith("archived");
  });
});
