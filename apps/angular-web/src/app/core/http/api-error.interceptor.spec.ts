import { TestBed } from "@angular/core/testing";
import { HttpClient, provideHttpClient, withInterceptors } from "@angular/common/http";
import { HttpTestingController, provideHttpClientTesting } from "@angular/common/http/testing";
import { firstValueFrom } from "rxjs";
import { ApiError } from "./api-error";
import { UNAUTHORIZED_HANDLER, apiErrorInterceptor } from "./api-error.interceptor";

describe("apiErrorInterceptor", () => {
  const onUnauthorized = vi.fn();

  beforeEach(() => {
    onUnauthorized.mockReset();
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([apiErrorInterceptor])),
        provideHttpClientTesting(),
        { provide: UNAUTHORIZED_HANDLER, useValue: onUnauthorized },
      ],
    });
  });

  it("maps a server error body to ApiError", async () => {
    const http = TestBed.inject(HttpClient);
    const ctrl = TestBed.inject(HttpTestingController);
    const pending = firstValueFrom(http.get("/api/v1/x"));
    ctrl
      .expectOne("/api/v1/x")
      .flush({ data: null, error: { message: "Boom" } }, { status: 500, statusText: "Server" });
    const err = await pending.catch((e) => e);
    expect(err).toBeInstanceOf(ApiError);
    expect(err.status).toBe(500);
    expect(err.message).toBe("Boom");
    expect(onUnauthorized).not.toHaveBeenCalled();
  });

  it("calls the unauthorized handler on 401", async () => {
    const http = TestBed.inject(HttpClient);
    const ctrl = TestBed.inject(HttpTestingController);
    const pending = firstValueFrom(http.get("/api/v1/x"));
    ctrl.expectOne("/api/v1/x").flush("Unauthorized", { status: 401, statusText: "Unauthorized" });
    const err = await pending.catch((e) => e);
    expect(err).toBeInstanceOf(ApiError);
    expect(err.status).toBe(401);
    expect(onUnauthorized).toHaveBeenCalledTimes(1);
  });

  it("falls back to the HTTP message when the body has no error field", async () => {
    const http = TestBed.inject(HttpClient);
    const ctrl = TestBed.inject(HttpTestingController);
    const pending = firstValueFrom(http.get("/api/v1/x"));
    ctrl.expectOne("/api/v1/x").flush(null, { status: 404, statusText: "Not Found" });
    const err = await pending.catch((e) => e);
    expect(err).toBeInstanceOf(ApiError);
    expect(err.isNotFound).toBe(true);
    expect(typeof err.message).toBe("string");
  });
});
