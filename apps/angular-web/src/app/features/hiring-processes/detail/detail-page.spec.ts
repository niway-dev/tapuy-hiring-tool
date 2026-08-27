import { TestBed } from "@angular/core/testing";
import { provideHttpClient, withInterceptors } from "@angular/common/http";
import { HttpTestingController, provideHttpClientTesting } from "@angular/common/http/testing";
import { provideRouter } from "@angular/router";
import { QueryClient, provideTanStackQuery } from "@tanstack/angular-query-experimental";
import { apiErrorInterceptor } from "../../../core/http/api-error.interceptor";
import type { HiringProcess } from "../../../core/api/hiring-process.model";
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

function setup() {
  TestBed.configureTestingModule({
    providers: [
      provideRouter([]),
      provideHttpClient(withInterceptors([apiErrorInterceptor])),
      provideHttpClientTesting(),
      provideTanStackQuery(new QueryClient({ defaultOptions: { queries: { retry: false } } })),
    ],
  });
  const ctrl = TestBed.inject(HttpTestingController);
  const fixture = TestBed.createComponent(DetailPage);
  fixture.componentRef.setInput("id", item.id);
  fixture.detectChanges();
  return { ctrl, fixture };
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
    expect(fixture.nativeElement.textContent).toContain("$3,000 / mo");
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
});
