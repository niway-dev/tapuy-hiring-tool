import { describe, expect, it, vi } from "vitest";
import { fireEvent, screen } from "@testing-library/react";
import { renderWithProviders } from "@/test/render";
import { ProcessBoard } from "./process-board";
import { HIRING_PROCESS_STATUS_ORDER } from "@interviews-tool/domain/constants";
import type { BoardColumn } from "@interviews-tool/application/hiring";
import type { HiringProcess } from "@/hooks/use-hiring-processes";

function card(id: string, companyName: string, status: HiringProcess["status"]): HiringProcess {
  return {
    id,
    companyName,
    jobTitle: "Dev",
    status,
    salary: 1000,
    currency: "USD",
    salaryRateType: "monthly",
    userId: "u1",
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

/* Every column, empty ones included — the board always shows the whole pipeline */
function makeColumns(cards: HiringProcess[] = []): BoardColumn[] {
  return HIRING_PROCESS_STATUS_ORDER.map((status) => {
    const mine = cards.filter((c) => c.status === status);
    return { status, count: mine.length, cards: mine };
  });
}

/** jsdom has no DataTransfer; the board only needs get/set of text/plain */
function fakeDataTransfer() {
  const store = new Map<string, string>();
  return {
    effectAllowed: "",
    dropEffect: "",
    setData: (format: string, value: string) => store.set(format, value),
    getData: (format: string) => store.get(format) ?? "",
  };
}

function columnFor(status: string) {
  // eslint-disable-next-line testing-library/no-node-access -- the drop target is the section wrapping the badge
  return screen.getByText(status).closest("section") as HTMLElement;
}

describe("ProcessBoard", () => {
  it("always renders the eight pipeline columns, empty ones included", async () => {
    await renderWithProviders(
      <ProcessBoard columns={makeColumns()} onMove={vi.fn()} onArchive={vi.fn()} />,
    );

    for (const label of [
      "First contact",
      "Ongoing",
      "On hold",
      "Offer made",
      "Offer accepted",
      "Hired",
      "Rejected",
      "Dropped out",
    ]) {
      expect(screen.getByText(label)).toBeTruthy();
    }
    expect(screen.getAllByText("Nothing here")).toHaveLength(8);
  });

  it("tells you moving is safe", async () => {
    await renderWithProviders(
      <ProcessBoard columns={makeColumns()} onMove={vi.fn()} onArchive={vi.fn()} />,
    );

    expect(screen.getByText(/Nothing is deleted by moving/)).toBeTruthy();
  });

  it("moves a card dropped on another column", async () => {
    const onMove = vi.fn();
    const columns = makeColumns([card("p1", "Acme Corp", "first-contact")]);
    await renderWithProviders(
      <ProcessBoard columns={columns} onMove={onMove} onArchive={vi.fn()} />,
    );

    const dataTransfer = fakeDataTransfer();
    fireEvent.dragStart(screen.getByText("Acme Corp"), { dataTransfer });
    const target = columnFor("Ongoing");
    fireEvent.dragOver(target, { dataTransfer });
    fireEvent.drop(target, { dataTransfer });

    expect(onMove).toHaveBeenCalledWith("p1", "first-contact", "ongoing");
  });

  it("does nothing when a card is dropped back on its own column", async () => {
    const onMove = vi.fn();
    const columns = makeColumns([card("p1", "Acme Corp", "ongoing")]);
    await renderWithProviders(
      <ProcessBoard columns={columns} onMove={onMove} onArchive={vi.fn()} />,
    );

    const dataTransfer = fakeDataTransfer();
    fireEvent.dragStart(screen.getByText("Acme Corp"), { dataTransfer });
    const target = columnFor("Ongoing");
    fireEvent.dragOver(target, { dataTransfer });
    fireEvent.drop(target, { dataTransfer });

    expect(onMove).not.toHaveBeenCalled();
  });

  it("accepts the drop by cancelling dragover — without it the browser never fires drop", async () => {
    const columns = makeColumns([card("p1", "Acme Corp", "first-contact")]);
    await renderWithProviders(
      <ProcessBoard columns={columns} onMove={vi.fn()} onArchive={vi.fn()} />,
    );

    const dataTransfer = fakeDataTransfer();
    fireEvent.dragStart(screen.getByText("Acme Corp"), { dataTransfer });

    const notCancelled = fireEvent.dragOver(columnFor("Ongoing"), { dataTransfer });
    expect(notCancelled).toBe(false);
  });

  it("invites the drop on the hovered column", async () => {
    const columns = makeColumns([card("p1", "Acme Corp", "first-contact")]);
    await renderWithProviders(
      <ProcessBoard columns={columns} onMove={vi.fn()} onArchive={vi.fn()} />,
    );

    const dataTransfer = fakeDataTransfer();
    fireEvent.dragStart(screen.getByText("Acme Corp"), { dataTransfer });
    fireEvent.dragOver(columnFor("Ongoing"), { dataTransfer });

    expect(screen.getByText("Drop here")).toBeTruthy();
  });
});
