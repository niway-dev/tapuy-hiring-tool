import { TestBed } from "@angular/core/testing";
import { provideHttpClient } from "@angular/common/http";
import { HttpTestingController, provideHttpClientTesting } from "@angular/common/http/testing";
import { HiringProcessesApi } from "./hiring-processes.api";
import type { HiringProcess } from "./hiring-process.model";

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

describe("HiringProcessesApi", () => {
  let api: HiringProcessesApi;
  let ctrl: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    api = TestBed.inject(HiringProcessesApi);
    ctrl = TestBed.inject(HttpTestingController);
  });

  afterEach(() => ctrl.verify());

  it("list() sends page/limit, repeats statuses and unwraps data + pagination", async () => {
    const pending = api.list({
      page: 2,
      limit: 10,
      statuses: ["ongoing", "hired"],
      salaryDeclared: true,
    });
    const req = ctrl.expectOne((r) => r.url === "/api/v1/hiring-processes");
    expect(req.request.method).toBe("GET");
    expect(req.request.params.get("page")).toBe("2");
    expect(req.request.params.get("limit")).toBe("10");
    expect(req.request.params.getAll("statuses")).toEqual(["ongoing", "hired"]);
    expect(req.request.params.get("salaryDeclared")).toBe("true");
    req.flush({
      data: [item],
      error: null,
      meta: { pagination: { page: 2, limit: 10, total: 11, totalPages: 2 } },
    });
    const result = await pending;
    expect(result.items).toEqual([item]);
    expect(result.pagination.totalPages).toBe(2);
  });

  it("list() omits optional params when not given", async () => {
    const pending = api.list({ page: 1, limit: 10 });
    const req = ctrl.expectOne((r) => r.url === "/api/v1/hiring-processes");
    expect(req.request.params.has("statuses")).toBe(false);
    expect(req.request.params.has("salaryDeclared")).toBe(false);
    req.flush({
      data: [],
      error: null,
      meta: { pagination: { page: 1, limit: 10, total: 0, totalPages: 0 } },
    });
    expect((await pending).items).toEqual([]);
  });

  it("get() unwraps data", async () => {
    const pending = api.get(item.id);
    ctrl.expectOne(`/api/v1/hiring-processes/${item.id}`).flush({ data: item, error: null });
    expect(await pending).toEqual(item);
  });

  it("create() POSTs the body", async () => {
    const pending = api.create({ companyName: "Acme", status: "first-contact" });
    const req = ctrl.expectOne("/api/v1/hiring-processes");
    expect(req.request.method).toBe("POST");
    expect(req.request.body).toEqual({ companyName: "Acme", status: "first-contact" });
    req.flush({ data: item, error: null }, { status: 201, statusText: "Created" });
    expect(await pending).toEqual(item);
  });

  it("update() PUTs the body", async () => {
    const pending = api.update(item.id, { companyName: "Acme 2", status: "ongoing" });
    const req = ctrl.expectOne(`/api/v1/hiring-processes/${item.id}`);
    expect(req.request.method).toBe("PUT");
    req.flush({ data: { ...item, companyName: "Acme 2" }, error: null });
    expect((await pending).companyName).toBe("Acme 2");
  });

  it("changeStatus() PATCHes /status", async () => {
    const pending = api.changeStatus(item.id, "hired");
    const req = ctrl.expectOne(`/api/v1/hiring-processes/${item.id}/status`);
    expect(req.request.method).toBe("PATCH");
    expect(req.request.body).toEqual({ status: "hired" });
    req.flush({ data: { ...item, status: "hired" }, error: null });
    expect((await pending).status).toBe("hired");
  });

  it("archive() POSTs /archive with a reason", async () => {
    const pending = api.archive(item.id, "no-reply");
    const req = ctrl.expectOne(`/api/v1/hiring-processes/${item.id}/archive`);
    expect(req.request.method).toBe("POST");
    expect(req.request.body).toEqual({ reason: "no-reply" });
    req.flush({
      data: { ...item, archivedAt: "2026-08-26T00:00:00.000Z", archiveReason: "no-reply" },
      error: null,
    });
    expect((await pending).archiveReason).toBe("no-reply");
  });

  it("restore() POSTs /restore", async () => {
    const pending = api.restore(item.id);
    const req = ctrl.expectOne(`/api/v1/hiring-processes/${item.id}/restore`);
    expect(req.request.method).toBe("POST");
    req.flush({ data: item, error: null });
    expect(await pending).toEqual(item);
  });

  it("delete() sends DELETE and resolves on 204", async () => {
    const pending = api.delete(item.id);
    const req = ctrl.expectOne(`/api/v1/hiring-processes/${item.id}`);
    expect(req.request.method).toBe("DELETE");
    req.flush(null, { status: 204, statusText: "No Content" });
    await expect(pending).resolves.toBeUndefined();
  });
});
