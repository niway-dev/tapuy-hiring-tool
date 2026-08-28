import { TestBed } from "@angular/core/testing";
import { provideHttpClient } from "@angular/common/http";
import { HttpTestingController, provideHttpClientTesting } from "@angular/common/http/testing";
import { InteractionsApi } from "./interactions.api";
import type { Interaction } from "./interaction.model";

const PROCESS = "11111111-1111-4111-8111-111111111111";
const BASE = `/api/v1/hiring-processes/${PROCESS}/interactions`;

const item: Interaction = {
  id: "22222222-2222-4222-8222-222222222222",
  hiringProcessId: PROCESS,
  title: "Recruiter call",
  content: "Talked about the role for twenty minutes.",
  type: "phone-call",
  createdAt: "2026-08-20T09:20:00.000Z",
  updatedAt: "2026-08-20T09:20:00.000Z",
};

describe("InteractionsApi", () => {
  let api: InteractionsApi;
  let ctrl: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    api = TestBed.inject(InteractionsApi);
    ctrl = TestBed.inject(HttpTestingController);
  });

  afterEach(() => ctrl.verify());

  it("list() GETs the nested collection and unwraps data", async () => {
    const pending = api.list(PROCESS);
    const req = ctrl.expectOne(BASE);
    expect(req.request.method).toBe("GET");
    req.flush({ data: [item], error: null });
    expect(await pending).toEqual([item]);
  });

  it("list() returns an empty array when data is null", async () => {
    const pending = api.list(PROCESS);
    ctrl.expectOne(BASE).flush({ data: null, error: null });
    expect(await pending).toEqual([]);
  });

  it("create() POSTs the body", async () => {
    const pending = api.create(PROCESS, { content: "A note long enough.", type: "note" });
    const req = ctrl.expectOne(BASE);
    expect(req.request.method).toBe("POST");
    expect(req.request.body).toEqual({ content: "A note long enough.", type: "note" });
    req.flush({ data: item, error: null }, { status: 201, statusText: "Created" });
    expect(await pending).toEqual(item);
  });

  it("update() PUTs to the interaction id", async () => {
    const pending = api.update(PROCESS, item.id, { content: "Edited content here." });
    const req = ctrl.expectOne(`${BASE}/${item.id}`);
    expect(req.request.method).toBe("PUT");
    expect(req.request.body).toEqual({ content: "Edited content here." });
    req.flush({ data: { ...item, content: "Edited content here." }, error: null });
    expect((await pending).content).toBe("Edited content here.");
  });

  it("delete() sends DELETE and resolves on 204", async () => {
    const pending = api.delete(PROCESS, item.id);
    const req = ctrl.expectOne(`${BASE}/${item.id}`);
    expect(req.request.method).toBe("DELETE");
    req.flush(null, { status: 204, statusText: "No Content" });
    await expect(pending).resolves.toBeUndefined();
  });
});
