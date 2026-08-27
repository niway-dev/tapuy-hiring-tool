import { TestBed } from "@angular/core/testing";
import { provideHttpClient, withInterceptors } from "@angular/common/http";
import { HttpTestingController, provideHttpClientTesting } from "@angular/common/http/testing";
import { Router, provideRouter } from "@angular/router";
import { QueryClient, provideTanStackQuery } from "@tanstack/angular-query-experimental";
import { apiErrorInterceptor } from "../../../core/http/api-error.interceptor";
import { InteractionsApi } from "../../../core/api/interactions.api";
import type { HiringProcess } from "../../../core/api/hiring-process.model";
import type { Interaction } from "../../../core/api/interaction.model";
import { DetailPage } from "./detail-page";

const item: HiringProcess = {
  id: "11111111-1111-4111-8111-111111111111",
  companyName: "Acme",
  jobTitle: "Frontend",
  status: "ongoing",
  salary: 3000,
  currency: "USD",
  salaryRateType: "monthly",
  userId: "u1",
  createdAt: "2026-08-01T00:00:00.000Z",
  updatedAt: "2026-08-20T00:00:00.000Z",
};

function setup(interactions: Interaction[] = []) {
  TestBed.configureTestingModule({
    providers: [
      provideRouter([]),
      provideHttpClient(withInterceptors([apiErrorInterceptor])),
      provideHttpClientTesting(),
      provideTanStackQuery(new QueryClient({ defaultOptions: { queries: { retry: false } } })),
      { provide: InteractionsApi, useValue: { list: vi.fn().mockResolvedValue(interactions) } },
    ],
  });
  const ctrl = TestBed.inject(HttpTestingController);
  const router = TestBed.inject(Router);
  const navigate = vi.spyOn(router, "navigate").mockResolvedValue(true);
  const fixture = TestBed.createComponent(DetailPage);
  fixture.componentRef.setInput("id", item.id);
  fixture.detectChanges();
  return { ctrl, fixture, navigate };
}

describe("DetailPage", () => {
  it("loads the process through httpResource and renders it", async () => {
    const { ctrl, fixture } = setup();
    await vi.waitFor(() =>
      ctrl.expectOne(`/api/v1/hiring-processes/${item.id}`).flush({ data: item, error: null }),
    );
    await vi.waitFor(() => {
      fixture.detectChanges();
      expect(fixture.nativeElement.textContent).toContain("Acme");
    });
    // The stats row shows the amount and the rate/currency on separate lines
    // (see process-stats.ts): the money pipe here omits the rate suffix.
    expect(fixture.nativeElement.textContent).toContain("$3,000");
    expect(fixture.nativeElement.textContent).toContain("per month · USD");
    expect(fixture.nativeElement.querySelector("select#next-status")).not.toBeNull();
  });

  it("shows a not-found state on 404", async () => {
    const { ctrl, fixture } = setup();
    await vi.waitFor(() =>
      ctrl
        .expectOne(`/api/v1/hiring-processes/${item.id}`)
        .flush(null, { status: 404, statusText: "Not Found" }),
    );
    await vi.waitFor(() => {
      fixture.detectChanges();
      expect(fixture.nativeElement.textContent).toContain("Hiring process not found");
    });
  });

  it("PATCHes the status and reloads", async () => {
    const { ctrl, fixture } = setup();
    await vi.waitFor(() =>
      ctrl.expectOne(`/api/v1/hiring-processes/${item.id}`).flush({ data: item, error: null }),
    );
    await vi.waitFor(() => {
      fixture.detectChanges();
      expect(fixture.nativeElement.querySelector("select#next-status")).not.toBeNull();
    });
    const select = fixture.nativeElement.querySelector("select#next-status") as HTMLSelectElement;
    select.value = "hired";
    select.dispatchEvent(new Event("change"));
    const patch = await vi.waitFor(() =>
      ctrl.expectOne(`/api/v1/hiring-processes/${item.id}/status`),
    );
    expect(patch.request.method).toBe("PATCH");
    expect(patch.request.body).toEqual({ status: "hired" });
    patch.flush({ data: { ...item, status: "hired" }, error: null });
    // reload() re-fetches the detail
    await vi.waitFor(() =>
      ctrl
        .expectOne(`/api/v1/hiring-processes/${item.id}`)
        .flush({ data: { ...item, status: "hired" }, error: null }),
    );
    await vi.waitFor(() => {
      fixture.detectChanges();
      expect(fixture.nativeElement.querySelector(".badge")?.textContent).toContain("Hired");
    });
  });

  it("keeps the loaded content mounted (no spinner) while a reload after an action is in flight", async () => {
    const { ctrl, fixture } = setup();
    await vi.waitFor(() =>
      ctrl.expectOne(`/api/v1/hiring-processes/${item.id}`).flush({ data: item, error: null }),
    );
    await vi.waitFor(() => {
      fixture.detectChanges();
      expect(fixture.nativeElement.textContent).toContain("Acme");
    });

    const select = fixture.nativeElement.querySelector("select#next-status") as HTMLSelectElement;
    select.value = "hired";
    select.dispatchEvent(new Event("change"));
    const patch = await vi.waitFor(() =>
      ctrl.expectOne(`/api/v1/hiring-processes/${item.id}/status`),
    );
    patch.flush({
      data: { process: { ...item, status: "hired" }, previous: { status: "ongoing" } },
      error: null,
    });

    // The status PATCH settled and onSettled triggered process.reload(): the
    // reload GET is now in flight, but not flushed yet. While it is pending,
    // the previously-loaded content must stay mounted — no spinner flash.
    const reloadReq = await vi.waitFor(() => ctrl.expectOne(`/api/v1/hiring-processes/${item.id}`));
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain("Acme");
    expect(fixture.nativeElement.querySelector("app-spinner")).toBeNull();

    reloadReq.flush({ data: { ...item, status: "hired" }, error: null });
    await vi.waitFor(() => {
      fixture.detectChanges();
      expect(fixture.nativeElement.querySelector(".badge")?.textContent).toContain("Hired");
    });
  });

  it("clears a stale error once a different action succeeds", async () => {
    const archivedItem: HiringProcess = {
      ...item,
      archivedAt: "2026-08-20T00:00:00.000Z",
      archiveReason: "no-reply",
    };
    const { ctrl, fixture } = setup();
    await vi.waitFor(() =>
      ctrl
        .expectOne(`/api/v1/hiring-processes/${item.id}`)
        .flush({ data: archivedItem, error: null }),
    );
    await vi.waitFor(() => {
      fixture.detectChanges();
      expect(fixture.nativeElement.querySelector("select#next-status")).not.toBeNull();
    });

    // Fail a status change.
    const select = fixture.nativeElement.querySelector("select#next-status") as HTMLSelectElement;
    select.value = "hired";
    select.dispatchEvent(new Event("change"));
    const patch = await vi.waitFor(() =>
      ctrl.expectOne(`/api/v1/hiring-processes/${item.id}/status`),
    );
    patch.flush(
      { data: null, error: { message: "Status change failed" } },
      { status: 500, statusText: "Server Error" },
    );
    // onSettled always reloads, even on failure.
    await vi.waitFor(() =>
      ctrl
        .expectOne(`/api/v1/hiring-processes/${item.id}`)
        .flush({ data: archivedItem, error: null }),
    );
    await vi.waitFor(() => {
      fixture.detectChanges();
      expect(fixture.nativeElement.querySelector(".field-error")?.textContent).toContain(
        "Status change failed",
      );
    });

    // Now succeed at a different action: restore.
    const restoreButton = Array.from(fixture.nativeElement.querySelectorAll("button")).find(
      (button) => (button as HTMLButtonElement).textContent?.trim() === "Restore",
    ) as HTMLButtonElement;
    restoreButton.click();
    const restore = await vi.waitFor(() =>
      ctrl.expectOne(`/api/v1/hiring-processes/${item.id}/restore`),
    );
    expect(restore.request.method).toBe("POST");
    const restoredItem: HiringProcess = { ...archivedItem, archivedAt: null, archiveReason: null };
    restore.flush({ data: restoredItem, error: null });
    await vi.waitFor(() =>
      ctrl
        .expectOne(`/api/v1/hiring-processes/${item.id}`)
        .flush({ data: restoredItem, error: null }),
    );
    await vi.waitFor(() => {
      fixture.detectChanges();
      expect(fixture.nativeElement.querySelector(".field-error")).toBeNull();
    });
    expect(fixture.nativeElement.textContent).not.toContain("Status change failed");
  });

  it("labels the status select with an accessible name", async () => {
    const { ctrl, fixture } = setup();
    await vi.waitFor(() =>
      ctrl.expectOne(`/api/v1/hiring-processes/${item.id}`).flush({ data: item, error: null }),
    );
    await vi.waitFor(() => {
      fixture.detectChanges();
      expect(fixture.nativeElement.querySelector("select#next-status")).not.toBeNull();
    });
    expect(fixture.nativeElement.querySelector("#next-status")?.getAttribute("aria-label")).toBe(
      "Move this process to another status",
    );
  });

  it("still navigates away after delete even if a status change fires while the delete is in flight", async () => {
    vi.spyOn(window, "confirm").mockReturnValue(true);
    const { ctrl, fixture, navigate } = setup();
    await vi.waitFor(() =>
      ctrl.expectOne(`/api/v1/hiring-processes/${item.id}`).flush({ data: item, error: null }),
    );
    await vi.waitFor(() => {
      fixture.detectChanges();
      expect(fixture.nativeElement.querySelector("select#next-status")).not.toBeNull();
    });

    // Confirm delete: the DELETE request is now in flight, but we don't flush it yet.
    const deleteButton = Array.from(fixture.nativeElement.querySelectorAll("button")).find(
      (button) => (button as HTMLButtonElement).textContent?.trim() === "Delete",
    ) as HTMLButtonElement;
    deleteButton.click();
    const deleteReq = await vi.waitFor(() => ctrl.expectOne(`/api/v1/hiring-processes/${item.id}`));
    expect(deleteReq.request.method).toBe("DELETE");

    // While the delete is still pending, fire a status change. Its
    // resetActionErrors() must not detach the still in-flight `remove` mutation.
    const select = fixture.nativeElement.querySelector("select#next-status") as HTMLSelectElement;
    select.value = "hired";
    select.dispatchEvent(new Event("change"));
    const patch = await vi.waitFor(() =>
      ctrl.expectOne(`/api/v1/hiring-processes/${item.id}/status`),
    );
    patch.flush({ data: { ...item, status: "hired" }, error: null });
    // onSettled reloads the detail.
    await vi.waitFor(() =>
      ctrl.expectOne(`/api/v1/hiring-processes/${item.id}`).flush({ data: item, error: null }),
    );

    // Now the delete finally settles.
    deleteReq.flush(null, { status: 204, statusText: "No Content" });
    await vi.waitFor(() => {
      expect(navigate).toHaveBeenCalledWith(["/hiring-processes"]);
    });
  });

  it("renders the four-stat row with the interaction count", async () => {
    const interactions: Interaction[] = [
      {
        id: "33333333-3333-4333-8333-333333333333",
        hiringProcessId: item.id,
        title: null,
        content: "A note with plenty of characters.",
        type: "note",
        createdAt: "2026-08-10T00:00:00.000Z",
        updatedAt: "2026-08-10T00:00:00.000Z",
      },
      {
        id: "44444444-4444-4444-8444-444444444444",
        hiringProcessId: item.id,
        title: null,
        content: "Another note with plenty of characters.",
        type: "note",
        createdAt: "2026-08-12T00:00:00.000Z",
        updatedAt: "2026-08-12T00:00:00.000Z",
      },
    ];
    const { ctrl, fixture } = setup(interactions);
    await vi.waitFor(() =>
      ctrl.expectOne(`/api/v1/hiring-processes/${item.id}`).flush({ data: item, error: null }),
    );
    await vi.waitFor(() => {
      fixture.detectChanges();
      expect(fixture.nativeElement.textContent).toContain("Interactions");
      expect(fixture.nativeElement.textContent).toContain("logged");
      expect(fixture.nativeElement.textContent).toContain("Last updated");
      // Assert on the stats block specifically -- not merely that "2" appears
      // somewhere on the page -- to actually exercise the TanStack list ->
      // computed -> httpResource-rendered-header chain.
      const statsRow = fixture.nativeElement.querySelector("app-process-stats > div");
      const interactionsBlock = statsRow?.children[1] as HTMLElement;
      expect(interactionsBlock?.textContent).toContain("Interactions");
      expect(interactionsBlock?.querySelector("p.text-2xl")?.textContent?.trim()).toBe("2");
    });
  });

  it("shows the back link and the company name in the header card", async () => {
    const { ctrl, fixture } = setup();
    await vi.waitFor(() =>
      ctrl.expectOne(`/api/v1/hiring-processes/${item.id}`).flush({ data: item, error: null }),
    );
    await vi.waitFor(() => {
      fixture.detectChanges();
      expect(fixture.nativeElement.textContent).toContain("Back to processes");
      expect(fixture.nativeElement.querySelector("h1")?.textContent).toContain("Acme");
    });
  });
});
