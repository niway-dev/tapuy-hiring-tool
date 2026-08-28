import { describe, expect, it, vi } from "vitest";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithProviders } from "@/test/render";
import { ProcessBoardCard } from "./process-board-card";
import type { HiringProcess } from "@/hooks/use-hiring-processes";

const DAY = 24 * 60 * 60 * 1000;

function makeCard(overrides: Partial<HiringProcess> = {}): HiringProcess {
  return {
    id: "p1",
    companyName: "Acme Corp",
    jobTitle: "React Native Developer",
    status: "first-contact",
    salary: 5200,
    currency: "USD",
    salaryRateType: "monthly",
    userId: "u1",
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

async function renderCard(
  card: HiringProcess,
  handlers: Partial<Record<"onMove" | "onArchive", ReturnType<typeof vi.fn>>> = {},
) {
  const onMove = handlers.onMove ?? vi.fn();
  const onArchive = handlers.onArchive ?? vi.fn();
  await renderWithProviders(
    <ProcessBoardCard
      card={card}
      isDragging={false}
      onDragStart={vi.fn()}
      onDragEnd={vi.fn()}
      onMove={onMove}
      onArchive={onArchive}
    />,
  );
  return { onMove, onArchive };
}

describe("ProcessBoardCard", () => {
  it("shows company, title and salary", async () => {
    await renderCard(makeCard());

    expect(screen.getByText("Acme Corp")).toBeTruthy();
    expect(screen.getByText("React Native Developer")).toBeTruthy();
    expect(screen.getByText("$5,200 / mo")).toBeTruthy();
  });

  it("falls back to an em dash when there is no job title", async () => {
    await renderCard(makeCard({ jobTitle: null }));

    expect(screen.getByText("—")).toBeTruthy();
  });

  it("opens the ⋯ menu with the other seven statuses and archive", async () => {
    await renderCard(makeCard({ status: "first-contact" }));

    await userEvent.click(screen.getByRole("button", { name: "Move to" }));

    for (const label of [
      "Ongoing",
      "On hold",
      "Offer made",
      "Offer accepted",
      "Hired",
      "Rejected",
      "Dropped out",
    ]) {
      expect(await screen.findByRole("menuitem", { name: label })).toBeTruthy();
    }

    /* The status it is already in is not offered */
    expect(screen.queryByRole("menuitem", { name: "First contact" })).toBeNull();
    expect(await screen.findByRole("menuitem", { name: "Archive…" })).toBeTruthy();
  });

  it("reports the chosen status", async () => {
    const { onMove } = await renderCard(makeCard({ status: "ongoing" }));

    await userEvent.click(screen.getByRole("button", { name: "Move to" }));
    await userEvent.click(await screen.findByRole("menuitem", { name: "Offer made" }));

    expect(onMove).toHaveBeenCalledWith("offer-made");
  });

  it("asks to archive from the menu", async () => {
    const { onArchive } = await renderCard(makeCard());

    await userEvent.click(screen.getByRole("button", { name: "Move to" }));
    await userEvent.click(await screen.findByRole("menuitem", { name: "Archive…" }));

    expect(onArchive).toHaveBeenCalled();
  });

  it("marks a stalled card's age in the on-hold amber", async () => {
    await renderCard(makeCard({ status: "ongoing", updatedAt: new Date(Date.now() - 60 * DAY) }));

    const age = screen.getByText("2mo");
    expect(age.className).toContain("text-status-on-hold-text");
  });

  it("leaves a fresh card's age muted", async () => {
    await renderCard(makeCard({ status: "ongoing", updatedAt: new Date(Date.now() - 4 * DAY) }));

    const age = screen.getByText("4d");
    expect(age.className).toContain("text-text-muted");
  });
});
