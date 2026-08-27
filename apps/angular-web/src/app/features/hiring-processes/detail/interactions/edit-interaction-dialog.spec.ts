import { TestBed } from "@angular/core/testing";
import type { Interaction } from "../../../../core/api/interaction.model";
import { EditInteractionDialog } from "./edit-interaction-dialog";

const noteInteraction: Interaction = {
  id: "22222222-2222-4222-8222-222222222222",
  hiringProcessId: "11111111-1111-4111-8111-111111111111",
  title: "Recruiter screen",
  content: "A note with plenty of characters.",
  type: "note",
  createdAt: "2026-08-20T09:20:00.000Z",
  updatedAt: "2026-08-20T09:20:00.000Z",
};

const offerInteraction: Interaction = {
  id: "33333333-3333-4333-8333-333333333333",
  hiringProcessId: "11111111-1111-4111-8111-111111111111",
  title: null,
  content: "They sent an offer with a base and a bonus.",
  type: "offer",
  createdAt: "2026-08-21T09:20:00.000Z",
  updatedAt: "2026-08-21T09:20:00.000Z",
};

function setup() {
  TestBed.configureTestingModule({});
  const fixture = TestBed.createComponent(EditInteractionDialog);
  fixture.detectChanges();
  const saved: { interactionId: string; body: unknown }[] = [];
  fixture.componentInstance.save.subscribe((v) => saved.push(v));
  const dialog = fixture.nativeElement.querySelector("dialog") as HTMLDialogElement;
  const title = fixture.nativeElement.querySelector("#edit-title") as HTMLInputElement;
  const type = fixture.nativeElement.querySelector("#edit-type") as HTMLSelectElement;
  const content = fixture.nativeElement.querySelector("#edit-content") as HTMLTextAreaElement;
  const saveButton = Array.from(fixture.nativeElement.querySelectorAll("button")).find(
    (b) => (b as HTMLButtonElement).textContent?.trim() === "Save changes",
  ) as HTMLButtonElement;
  return { fixture, saved, dialog, title, type, content, saveButton };
}

function typeInto(el: HTMLInputElement | HTMLTextAreaElement, value: string) {
  el.value = value;
  el.dispatchEvent(new Event("input"));
}

describe("EditInteractionDialog", () => {
  it("seeds title, content and type on open, and the type select shows the current type", () => {
    const { fixture, title, type, content } = setup();
    fixture.componentInstance.open(noteInteraction);
    fixture.detectChanges();
    expect(title.value).toBe("Recruiter screen");
    expect(content.value).toBe("A note with plenty of characters.");
    expect(type.value).toBe("note");
  });

  it("does not emit save and shows the minimum-length message for content under 10 characters", () => {
    const { fixture, saved, content, saveButton } = setup();
    fixture.componentInstance.open(noteInteraction);
    fixture.detectChanges();
    typeInto(content, "short");
    fixture.detectChanges();
    saveButton.click();
    fixture.detectChanges();
    expect(saved).toHaveLength(0);
    expect(fixture.nativeElement.textContent).toContain("at least 10 characters");
  });

  it("emits save with the interaction id, type, and title omitted when blank", () => {
    const { fixture, saved, title, content, saveButton } = setup();
    fixture.componentInstance.open(offerInteraction);
    fixture.detectChanges();
    typeInto(content, "An updated offer note with enough characters.");
    typeInto(title, "   ");
    fixture.detectChanges();
    saveButton.click();
    fixture.detectChanges();
    expect(saved).toHaveLength(1);
    expect(saved[0]).toEqual({
      interactionId: offerInteraction.id,
      body: { content: "An updated offer note with enough characters.", type: "offer" },
    });
    expect(Object.prototype.hasOwnProperty.call((saved[0] as { body: object }).body, "title")).toBe(
      false,
    );
  });

  it("includes a non-blank title in the emitted body", () => {
    const { fixture, saved, title, content, saveButton } = setup();
    fixture.componentInstance.open(noteInteraction);
    fixture.detectChanges();
    typeInto(content, "Content long enough to pass validation.");
    typeInto(title, "  A trimmed title  ");
    fixture.detectChanges();
    saveButton.click();
    fixture.detectChanges();
    expect(saved).toHaveLength(1);
    expect(saved[0]).toEqual({
      interactionId: noteInteraction.id,
      body: {
        content: "Content long enough to pass validation.",
        type: "note",
        title: "A trimmed title",
      },
    });
  });

  it("fully re-seeds on a second open() with a different interaction, leaking no prior state", () => {
    const { fixture, title, type, content, saveButton } = setup();
    fixture.componentInstance.open(noteInteraction);
    fixture.detectChanges();
    // Dirty the form (including the too-short error) before the second open,
    // to prove open() overwrites it rather than leaving it displayed.
    typeInto(content, "short");
    fixture.detectChanges();
    saveButton.click();
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain("at least 10 characters");

    fixture.componentInstance.open(offerInteraction);
    fixture.detectChanges();
    expect(title.value).toBe("");
    expect(content.value).toBe(offerInteraction.content);
    expect(type.value).toBe("offer");
    expect(fixture.nativeElement.textContent).not.toContain("at least 10 characters");
  });

  it("shows a server error inside the dialog, above the buttons", () => {
    const { fixture } = setup();
    fixture.componentInstance.open(noteInteraction);
    fixture.componentRef.setInput("serverError", "Update rejected");
    fixture.detectChanges();
    const alerts = Array.from(
      fixture.nativeElement.querySelectorAll('[role="alert"]'),
    ) as HTMLElement[];
    expect(alerts.some((el) => el.textContent?.includes("Update rejected"))).toBe(true);
  });

  it("disables Save and swaps its label while pending, and ignores a save attempt", () => {
    const { fixture, saved, content, saveButton } = setup();
    fixture.componentInstance.open(noteInteraction);
    typeInto(content, "Content long enough to pass validation.");
    fixture.componentRef.setInput("pending", true);
    fixture.detectChanges();
    expect(saveButton.disabled).toBe(true);
    expect(saveButton.textContent?.trim()).toBe("Saving…");
    saveButton.click();
    fixture.detectChanges();
    expect(saved).toHaveLength(0);
  });

  it("emits closed when the native dialog closes", () => {
    const { fixture, dialog } = setup();
    const closes: void[] = [];
    fixture.componentInstance.closed.subscribe(() => closes.push(undefined));
    fixture.componentInstance.open(noteInteraction);
    fixture.detectChanges();
    dialog.dispatchEvent(new Event("close"));
    fixture.detectChanges();
    expect(closes).toHaveLength(1);
  });

  it("does not close the dialog itself when saving", () => {
    const { fixture, dialog, content, saveButton } = setup();
    fixture.componentInstance.open(noteInteraction);
    fixture.detectChanges();
    expect(dialog.hasAttribute("open")).toBe(true);
    typeInto(content, "Content long enough to pass validation.");
    fixture.detectChanges();
    saveButton.click();
    fixture.detectChanges();
    // Closing is now the owning section's job (via its own onSuccess), not
    // onSave's -- a failed update must leave the dialog open with the edit
    // still in it.
    expect(dialog.hasAttribute("open")).toBe(true);
  });
});
