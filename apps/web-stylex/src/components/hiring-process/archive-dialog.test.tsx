import { describe, expect, it, vi } from "vitest";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithProviders } from "@/test/render";
import { ArchiveDialog } from "./archive-dialog";

async function renderDialog(overrides: { isStale?: boolean } = {}) {
  const onConfirm = vi.fn();
  const onCancel = vi.fn();
  await renderWithProviders(
    <ArchiveDialog
      companyName="Acme Corp"
      isStale={overrides.isStale ?? false}
      onConfirm={onConfirm}
      onCancel={onCancel}
    />,
  );
  return { onConfirm, onCancel };
}

/* The selected chip is the one that reads as pressed */
function selectedReason() {
  return screen
    .getAllByRole("button", { pressed: true })
    .map((button) => button.textContent)
    .at(0);
}

describe("ArchiveDialog", () => {
  it("names the company and promises nothing is lost", async () => {
    await renderDialog();

    expect(await screen.findByText("Archive Acme Corp?")).toBeTruthy();
    expect(
      screen.getByText("It keeps its status and every note. You'll find it under Archived."),
    ).toBeTruthy();
  });

  it("offers the four reasons", async () => {
    await renderDialog();

    for (const label of ["No reply", "They passed", "I withdrew", "Role closed"]) {
      expect(await screen.findByRole("button", { name: label })).toBeTruthy();
    }
  });

  it("preselects 'No reply' for a stalled process", async () => {
    await renderDialog({ isStale: true });
    await screen.findByText("Archive Acme Corp?");

    expect(selectedReason()).toBe("No reply");
  });

  it("preselects 'They passed' when the process is not stalled", async () => {
    await renderDialog({ isStale: false });
    await screen.findByText("Archive Acme Corp?");

    expect(selectedReason()).toBe("They passed");
  });

  it("confirms with the preselected reason, so the common case is one click", async () => {
    const { onConfirm } = await renderDialog({ isStale: true });

    await userEvent.click(await screen.findByRole("button", { name: "Archive" }));

    expect(onConfirm).toHaveBeenCalledWith("no-reply");
  });

  it("confirms with a reason the user picks instead", async () => {
    const { onConfirm } = await renderDialog({ isStale: true });

    await userEvent.click(await screen.findByRole("button", { name: "Role closed" }));
    await userEvent.click(screen.getByRole("button", { name: "Archive" }));

    expect(onConfirm).toHaveBeenCalledWith("role-closed");
  });

  it("cancels without archiving", async () => {
    const { onConfirm, onCancel } = await renderDialog();

    await userEvent.click(await screen.findByRole("button", { name: "Cancel" }));

    expect(onConfirm).not.toHaveBeenCalled();
    expect(onCancel).toHaveBeenCalled();
  });
});
