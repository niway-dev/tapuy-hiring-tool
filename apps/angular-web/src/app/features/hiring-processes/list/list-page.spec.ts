import { TestBed } from "@angular/core/testing";
import { Router, provideRouter } from "@angular/router";
import { QueryClient, provideTanStackQuery } from "@tanstack/angular-query-experimental";
import { HiringProcessesApi } from "../../../core/api/hiring-processes.api";
import type { HiringProcess } from "../../../core/api/hiring-process.model";
import { ListPage } from "./list-page";

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

function setup(items: HiringProcess[]) {
  const api = {
    list: vi.fn().mockResolvedValue({
      items,
      pagination: { page: 1, limit: 10, total: items.length, totalPages: items.length ? 1 : 0 },
    }),
  };
  TestBed.configureTestingModule({
    providers: [
      provideRouter([]),
      provideTanStackQuery(new QueryClient({ defaultOptions: { queries: { retry: false } } })),
      { provide: HiringProcessesApi, useValue: api },
    ],
  });
  const router = TestBed.inject(Router);
  const navigate = vi.spyOn(router, "navigate").mockResolvedValue(true);
  const fixture = TestBed.createComponent(ListPage);
  return { api, fixture, navigate };
}

describe("ListPage", () => {
  it("renders the rows returned by the API", async () => {
    const { api, fixture } = setup([item]);
    fixture.detectChanges();
    await vi.waitFor(() => {
      fixture.detectChanges();
      expect(fixture.nativeElement.textContent).toContain("Acme");
    });
    expect(api.list).toHaveBeenCalledWith({
      page: 1,
      limit: 10,
      statuses: undefined,
      salaryDeclared: undefined,
    });
    expect(fixture.nativeElement.textContent).toContain("$3,000 / mo");
    expect(fixture.nativeElement.querySelector(".badge")?.textContent).toContain("Ongoing");
  });

  it("maps route inputs to API params", async () => {
    const { api, fixture } = setup([item]);
    fixture.componentRef.setInput("page", "2");
    fixture.componentRef.setInput("status", "hired");
    fixture.componentRef.setInput("salaryDeclared", "true");
    fixture.detectChanges();
    await vi.waitFor(() =>
      expect(api.list).toHaveBeenCalledWith({
        page: 2,
        limit: 10,
        statuses: ["hired"],
        salaryDeclared: true,
      }),
    );
  });

  it("shows the empty state when there are no rows", async () => {
    const { fixture } = setup([]);
    fixture.detectChanges();
    await vi.waitFor(() => {
      fixture.detectChanges();
      expect(fixture.nativeElement.textContent).toContain("No hiring processes yet");
    });
  });

  it("writes filter changes to the URL and resets the page", async () => {
    const { fixture, navigate } = setup([item]);
    fixture.detectChanges();
    await fixture.whenStable();
    const select = fixture.nativeElement.querySelector("select#status") as HTMLSelectElement;
    select.value = "hired";
    select.dispatchEvent(new Event("change"));
    expect(navigate).toHaveBeenCalledWith(
      [],
      expect.objectContaining({
        queryParams: { status: "hired", salaryDeclared: null, page: null },
        queryParamsHandling: "merge",
      }),
    );
  });
});
