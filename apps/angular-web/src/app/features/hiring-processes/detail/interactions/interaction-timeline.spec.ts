import { TestBed } from "@angular/core/testing";
import { QueryClient, provideTanStackQuery } from "@tanstack/angular-query-experimental";
import { InteractionsApi } from "../../../../core/api/interactions.api";
import type { Interaction } from "../../../../core/api/interaction.model";
import { InteractionTimeline } from "./interaction-timeline";

const PROCESS = "11111111-1111-4111-8111-111111111111";

function make(id: string, createdAt: string, content = "A note with enough text."): Interaction {
  return {
    id,
    hiringProcessId: PROCESS,
    title: null,
    content,
    type: "note",
    createdAt,
    updatedAt: createdAt,
  };
}

function setup(list: () => Promise<Interaction[]>) {
  const api = { list: vi.fn().mockImplementation(list) };
  TestBed.configureTestingModule({
    providers: [
      provideTanStackQuery(new QueryClient({ defaultOptions: { queries: { retry: false } } })),
      { provide: InteractionsApi, useValue: api },
    ],
  });
  const fixture = TestBed.createComponent(InteractionTimeline);
  fixture.componentRef.setInput("hiringProcessId", PROCESS);
  fixture.detectChanges();
  return { api, fixture };
}

describe("InteractionTimeline", () => {
  it("renders one card per interaction, newest first", async () => {
    const { fixture } = setup(async () => [
      make("old", "2026-08-01T10:00:00.000Z", "The older note here."),
      make("new", "2026-08-20T10:00:00.000Z", "The newer note here."),
    ]);
    await vi.waitFor(() => {
      fixture.detectChanges();
      expect(fixture.nativeElement.querySelectorAll("app-interaction-card").length).toBe(2);
    });
    const text = fixture.nativeElement.textContent as string;
    expect(text.indexOf("newer note")).toBeLessThan(text.indexOf("older note"));
  });

  it("shows the empty state when there are none", async () => {
    const { fixture } = setup(async () => []);
    await vi.waitFor(() => {
      fixture.detectChanges();
      expect(fixture.nativeElement.textContent).toContain("No interactions logged yet");
    });
  });

  it("shows an error with a retry that refetches", async () => {
    const { api, fixture } = setup(async () => {
      throw new Error("Boom");
    });
    await vi.waitFor(() => {
      fixture.detectChanges();
      expect(fixture.nativeElement.textContent).toContain("Boom");
    });
    const before = api.list.mock.calls.length;
    const retry = [...fixture.nativeElement.querySelectorAll("button")].find((b) =>
      (b as HTMLButtonElement).textContent?.includes("Retry"),
    ) as HTMLButtonElement;
    retry.click();
    await vi.waitFor(() => expect(api.list.mock.calls.length).toBeGreaterThan(before));
  });

  it("forwards edit and remove from a card", async () => {
    const { fixture } = setup(async () => [make("one", "2026-08-20T10:00:00.000Z")]);
    await vi.waitFor(() => {
      fixture.detectChanges();
      expect(fixture.nativeElement.querySelector("app-interaction-card")).not.toBeNull();
    });
    const edited: Interaction[] = [];
    fixture.componentInstance.edit.subscribe((v) => edited.push(v));
    const editButton = fixture.nativeElement.querySelector(
      "button[aria-label='Edit interaction']",
    ) as HTMLButtonElement;
    editButton.click();
    expect(edited).toHaveLength(1);
  });
});
