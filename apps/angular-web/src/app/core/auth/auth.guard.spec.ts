import { TestBed } from "@angular/core/testing";
import {
  Router,
  UrlTree,
  provideRouter,
  type ActivatedRouteSnapshot,
  type RouterStateSnapshot,
} from "@angular/router";
import { AUTH_CLIENT, type AuthClient } from "./auth-client";
import { AuthService } from "./auth.service";
import { authGuard, guestGuard } from "./auth.guard";

const user = { id: "u1", email: "a@b.co", name: "Ana" };
const route = {} as ActivatedRouteSnapshot;
const state = { url: "/hiring-processes/new" } as RouterStateSnapshot;

function setup(sessionUser: typeof user | null) {
  const fake = {
    getSession: vi
      .fn()
      .mockResolvedValue({ data: sessionUser ? { user: sessionUser } : null, error: null }),
  };
  TestBed.configureTestingModule({
    providers: [
      provideRouter([]),
      { provide: AUTH_CLIENT, useValue: fake as unknown as AuthClient },
    ],
  });
  return { router: TestBed.inject(Router), auth: TestBed.inject(AuthService) };
}

describe("authGuard", () => {
  it("allows an authenticated user", async () => {
    setup(user);
    const result = await TestBed.runInInjectionContext(() => authGuard(route, state));
    expect(result).toBe(true);
  });

  it("redirects an anonymous user to login with the redirect param", async () => {
    const { router } = setup(null);
    const result = await TestBed.runInInjectionContext(() => authGuard(route, state));
    expect(result).toBeInstanceOf(UrlTree);
    expect(router.serializeUrl(result as UrlTree)).toBe(
      "/auth/login?redirect=%2Fhiring-processes%2Fnew",
    );
  });
});

describe("guestGuard", () => {
  it("allows an anonymous user", async () => {
    setup(null);
    const result = await TestBed.runInInjectionContext(() => guestGuard(route, state));
    expect(result).toBe(true);
  });

  it("sends an authenticated user to the list", async () => {
    const { router } = setup(user);
    const result = await TestBed.runInInjectionContext(() => guestGuard(route, state));
    expect(router.serializeUrl(result as UrlTree)).toBe("/hiring-processes");
  });
});
