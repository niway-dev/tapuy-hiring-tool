import { TestBed } from "@angular/core/testing";
import { Router, provideRouter } from "@angular/router";
import { AuthService } from "../../core/auth/auth.service";
import { Login } from "./login";

function setup() {
  const auth = { signIn: vi.fn().mockResolvedValue(undefined) };
  TestBed.configureTestingModule({
    providers: [provideRouter([]), { provide: AuthService, useValue: auth }],
  });
  const router = TestBed.inject(Router);
  const navigate = vi.spyOn(router, "navigateByUrl").mockResolvedValue(true);
  const fixture = TestBed.createComponent(Login);
  return { auth, fixture, navigate };
}

function fill(
  fixture: ReturnType<typeof TestBed.createComponent>,
  selector: string,
  value: string,
) {
  const el = fixture.nativeElement.querySelector(selector) as HTMLInputElement;
  el.value = value;
  el.dispatchEvent(new Event("input"));
}

describe("Login", () => {
  it("shows validation errors when submitted empty", async () => {
    const { auth, fixture } = setup();
    await fixture.whenStable();
    (fixture.nativeElement.querySelector("form") as HTMLFormElement).requestSubmit();
    await fixture.whenStable();
    expect(fixture.nativeElement.textContent).toContain("Email is required");
    expect(fixture.nativeElement.textContent).toContain("Password is required");
    expect(auth.signIn).not.toHaveBeenCalled();
  });

  it("signs in and navigates to the redirect target", async () => {
    const { auth, fixture, navigate } = setup();
    fixture.componentRef.setInput("redirect", "/hiring-processes/new");
    await fixture.whenStable();
    fill(fixture, "input[type=email]", "a@b.co");
    fill(fixture, "input[type=password]", "secret123");
    await fixture.whenStable();
    (fixture.nativeElement.querySelector("form") as HTMLFormElement).requestSubmit();
    await vi.waitFor(() => expect(auth.signIn).toHaveBeenCalledWith("a@b.co", "secret123"));
    await vi.waitFor(() => expect(navigate).toHaveBeenCalledWith("/hiring-processes/new"));
  });

  it("shows the server error message", async () => {
    const { auth, fixture } = setup();
    auth.signIn.mockRejectedValueOnce(new Error("Invalid credentials"));
    await fixture.whenStable();
    fill(fixture, "input[type=email]", "a@b.co");
    fill(fixture, "input[type=password]", "secret123");
    await fixture.whenStable();
    (fixture.nativeElement.querySelector("form") as HTMLFormElement).requestSubmit();
    await vi.waitFor(() => {
      fixture.detectChanges();
      expect(fixture.nativeElement.textContent).toContain("Invalid credentials");
    });
  });
});
