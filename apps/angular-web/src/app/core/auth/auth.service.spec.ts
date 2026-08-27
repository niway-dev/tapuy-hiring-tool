import { TestBed } from "@angular/core/testing";
import { AUTH_CLIENT, type AuthClient } from "./auth-client";
import { AuthService } from "./auth.service";

const user = { id: "u1", email: "a@b.co", name: "Ana" };

function makeFakeClient() {
  return {
    getSession: vi.fn().mockResolvedValue({ data: { user }, error: null }),
    signIn: { email: vi.fn().mockResolvedValue({ data: {}, error: null }) },
    signUp: { email: vi.fn().mockResolvedValue({ data: {}, error: null }) },
    signOut: vi.fn().mockResolvedValue({ data: {}, error: null }),
  };
}

describe("AuthService", () => {
  let fake: ReturnType<typeof makeFakeClient>;
  let service: AuthService;

  beforeEach(() => {
    fake = makeFakeClient();
    TestBed.configureTestingModule({
      providers: [{ provide: AUTH_CLIENT, useValue: fake as unknown as AuthClient }],
    });
    service = TestBed.inject(AuthService);
  });

  it("starts in loading state", () => {
    expect(service.status()).toBe("loading");
    expect(service.isAuthenticated()).toBe(false);
  });

  it("refresh() sets the user and authed status", async () => {
    await service.refresh();
    expect(service.user()).toEqual(user);
    expect(service.status()).toBe("authed");
    expect(service.isAuthenticated()).toBe(true);
  });

  it("refresh() with no session sets anon", async () => {
    fake.getSession.mockResolvedValueOnce({ data: null, error: null });
    await service.refresh();
    expect(service.user()).toBeNull();
    expect(service.status()).toBe("anon");
  });

  it("signIn() calls the client and refreshes", async () => {
    await service.signIn("a@b.co", "secret123");
    expect(fake.signIn.email).toHaveBeenCalledWith({ email: "a@b.co", password: "secret123" });
    expect(service.status()).toBe("authed");
  });

  it("signIn() throws the server message on error", async () => {
    fake.signIn.email.mockResolvedValueOnce({
      data: null,
      error: { message: "Invalid credentials" },
    });
    await expect(service.signIn("a@b.co", "bad")).rejects.toThrow("Invalid credentials");
    expect(service.status()).toBe("loading");
  });

  it("signUp() calls the client with name and refreshes", async () => {
    await service.signUp("Ana", "a@b.co", "secret123");
    expect(fake.signUp.email).toHaveBeenCalledWith({
      name: "Ana",
      email: "a@b.co",
      password: "secret123",
    });
    expect(service.status()).toBe("authed");
  });

  it("signOut() clears the user", async () => {
    await service.refresh();
    await service.signOut();
    expect(fake.signOut).toHaveBeenCalled();
    expect(service.user()).toBeNull();
    expect(service.status()).toBe("anon");
  });
});
