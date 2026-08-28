import { describe, expect, it, vi } from "vitest";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithProviders } from "@/test/render";
import { InterviewTable } from "./hiring-process-table";
import type { HiringProcess } from "@/hooks/use-hiring-processes";

const DAY = 24 * 60 * 60 * 1000;

function makeRow(overrides: Partial<HiringProcess> = {}): HiringProcess {
  return {
    id: "p1",
    companyName: "Acme Corp",
    jobTitle: "React Native Developer",
    status: "ongoing",
    salary: 5200,
    currency: "USD",
    salaryRateType: "monthly",
    userId: "u1",
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

async function renderTable(
  rows: HiringProcess[],
  props: Partial<React.ComponentProps<typeof InterviewTable>> = {},
) {
  const onArchive = vi.fn();
  const onRestore = vi.fn();
  await renderWithProviders(
    <InterviewTable
      interviews={rows}
      onDelete={vi.fn()}
      pagination={{ pageIndex: 0, pageSize: 10 }}
      onPaginationChange={vi.fn()}
      totalCount={rows.length}
      onArchive={onArchive}
      onRestore={onRestore}
      {...props}
    />,
  );
  return { onArchive, onRestore };
}

describe("InterviewTable — active scope", () => {
  it("offers archiving from the row", async () => {
    const { onArchive } = await renderTable([makeRow()]);

    await userEvent.click(screen.getByRole("button", { name: "Archive" }));

    expect(onArchive).toHaveBeenCalledWith(expect.objectContaining({ id: "p1" }));
  });

  it("shows how long a stalled row has been silent, in amber", async () => {
    await renderTable([makeRow({ status: "ongoing", updatedAt: new Date(Date.now() - 90 * DAY) })]);

    const age = screen.getByText("3mo");
    // eslint-disable-next-line testing-library/no-node-access -- the amber lives on the cell span wrapping date + age
    expect(age.parentElement?.className).toContain("text-status-on-hold-text");
  });

  it("leaves a fresh row without an age", async () => {
    await renderTable([makeRow({ updatedAt: new Date(Date.now() - 2 * DAY) })]);

    expect(screen.queryByText("2d")).toBeNull();
  });

  it("does not offer restoring", async () => {
    await renderTable([makeRow()]);

    expect(screen.queryByRole("button", { name: "Restore" })).toBeNull();
  });
});

describe("InterviewTable — archived scope", () => {
  const archivedRow = makeRow({
    status: "on-hold",
    archivedAt: new Date("2026-08-01T00:00:00Z"),
    archiveReason: "they-passed",
  });

  it("keeps the status the process stopped at, under its own heading", async () => {
    await renderTable([archivedRow], { scope: "archived" });

    expect(screen.getByText("Status when archived")).toBeTruthy();
    expect(screen.getByText("On hold")).toBeTruthy();
  });

  it("says when it was archived and why", async () => {
    await renderTable([archivedRow], { scope: "archived" });

    expect(screen.getByText(/They passed/)).toBeTruthy();
  });

  it("offers restoring instead of archiving", async () => {
    const { onRestore } = await renderTable([archivedRow], { scope: "archived" });

    expect(screen.queryByRole("button", { name: "Archive" })).toBeNull();
    await userEvent.click(screen.getByRole("button", { name: "Restore" }));

    expect(onRestore).toHaveBeenCalledWith("p1");
  });
});
