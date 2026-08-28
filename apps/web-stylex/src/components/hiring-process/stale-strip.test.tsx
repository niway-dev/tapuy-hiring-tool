import { describe, expect, it, vi } from "vitest";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithProviders } from "@/test/render";
import { StaleStrip } from "./stale-strip";

describe("StaleStrip", () => {
  it("says how many processes went quiet and for how long", async () => {
    await renderWithProviders(<StaleStrip count={5} onShowThem={vi.fn()} onDismiss={vi.fn()} />);

    expect(screen.getByText("5 open processes have had no update in over 45 days.")).toBeTruthy();
  });

  it("uses the singular for a lone process", async () => {
    await renderWithProviders(<StaleStrip count={1} onShowThem={vi.fn()} onDismiss={vi.fn()} />);

    expect(screen.getByText("1 open process has had no update in over 45 days.")).toBeTruthy();
  });

  it("opens the cleanup queue", async () => {
    const onShowThem = vi.fn();
    await renderWithProviders(<StaleStrip count={3} onShowThem={onShowThem} onDismiss={vi.fn()} />);

    await userEvent.click(screen.getByRole("button", { name: "Show them" }));

    expect(onShowThem).toHaveBeenCalled();
  });

  it("can be put off", async () => {
    const onDismiss = vi.fn();
    await renderWithProviders(<StaleStrip count={3} onShowThem={vi.fn()} onDismiss={onDismiss} />);

    await userEvent.click(screen.getByRole("button", { name: "Not now" }));

    expect(onDismiss).toHaveBeenCalled();
  });
});
