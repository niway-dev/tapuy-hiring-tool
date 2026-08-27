import { TestBed } from "@angular/core/testing";
import { provideRouter } from "@angular/router";
import { App } from "./app";
import { AuthService } from "./core/auth/auth.service";

describe("App", () => {
  it("shows the user email and sign out when authenticated", async () => {
    TestBed.configureTestingModule({ providers: [provideRouter([])] });
    const auth = TestBed.inject(AuthService);
    auth.user.set({ id: "u1", email: "a@b.co", name: "Ana" });
    auth.status.set("authed");
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    const text = fixture.nativeElement.textContent as string;
    expect(text).toContain("a@b.co");
    expect(text).toContain("Sign out");
  });

  it("hides the user area when anonymous", async () => {
    TestBed.configureTestingModule({ providers: [provideRouter([])] });
    TestBed.inject(AuthService).status.set("anon");
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    expect(fixture.nativeElement.textContent).not.toContain("Sign out");
  });
});
