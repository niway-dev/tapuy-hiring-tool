import { TestBed } from "@angular/core/testing";
import { QueryClient, provideTanStackQuery } from "@tanstack/angular-query-experimental";
import { InteractionsApi } from "../../../../core/api/interactions.api";
import type { Interaction } from "../../../../core/api/interaction.model";
import { InteractionSection } from "./interaction-section";

const PROCESS = "11111111-1111-4111-8111-111111111111";

const item: Interaction = {
  id: "22222222-2222-4222-8222-222222222222",
  hiringProcessId: PROCESS,
  title: null,
  content: "A note with plenty of characters.",
  type: "note",
  createdAt: "2026-08-20T09:20:00.000Z",
  updatedAt: "2026-08-20T09:20:00.000Z",
};

function setup(items: Interaction[] = [item]) {
  const api = {
    list: vi.fn().mockResolvedValue(items),
    create: vi.fn().mockResolvedValue(item),
    update: vi.fn().mockResolvedValue(item),
    delete: vi.fn().mockResolvedValue(undefined),
  };
  TestBed.configureTestingModule({
    providers: [
      provideTanStackQuery(new QueryClient({ defaultOptions: { queries: { retry: false } } })),
      { provide: InteractionsApi, useValue: api },
    ],
  });
  const fixture = TestBed.createComponent(InteractionSection);
  fixture.componentRef.setInput("hiringProcessId", PROCESS);
  fixture.detectChanges();
  return { api, fixture };
}

describe("InteractionSection", () => {
  it("shows the heading and the logged count", async () => {
    const { fixture } = setup([item, { ...item, id: "other" }]);
    await vi.waitFor(() => {
      fixture.detectChanges();
      expect(fixture.nativeElement.textContent).toContain("Interactions");
      expect(fixture.nativeElement.textContent).toContain("2 logged");
    });
  });

  it("creates a note from the quick composer and emits changed", async () => {
    const { api, fixture } = setup();
    const changes: void[] = [];
    fixture.componentInstance.changed.subscribe(() => changes.push(undefined));
    await vi.waitFor(() => {
      fixture.detectChanges();
      expect(fixture.nativeElement.querySelector("input")).not.toBeNull();
    });
    const input = fixture.nativeElement.querySelector("input") as HTMLInputElement;
    input.value = "Recruiter called about the role";
    input.dispatchEvent(new Event("input"));
    fixture.detectChanges();
    input.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true }));
    await vi.waitFor(() =>
      expect(api.create).toHaveBeenCalledWith(PROCESS, {
        content: "Recruiter called about the role",
        type: "note",
      }),
    );
    await vi.waitFor(() => expect(changes.length).toBeGreaterThan(0));
  });

  it("surfaces a create failure without losing the section", async () => {
    const { api, fixture } = setup();
    api.create.mockRejectedValueOnce(new Error("Server said no"));
    await vi.waitFor(() => {
      fixture.detectChanges();
      expect(fixture.nativeElement.querySelector("input")).not.toBeNull();
    });
    const input = fixture.nativeElement.querySelector("input") as HTMLInputElement;
    input.value = "Recruiter called about the role";
    input.dispatchEvent(new Event("input"));
    fixture.detectChanges();
    input.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true }));
    await vi.waitFor(() => {
      fixture.detectChanges();
      expect(fixture.nativeElement.textContent).toContain("Server said no");
    });
  });
});
