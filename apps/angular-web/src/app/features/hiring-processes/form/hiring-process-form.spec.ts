import { TestBed } from "@angular/core/testing";
import type { HiringProcess } from "../../../core/api/hiring-process.model";
import { HiringProcessForm } from "./hiring-process-form";

function setup(initial: HiringProcess | null = null) {
  TestBed.configureTestingModule({});
  const fixture = TestBed.createComponent(HiringProcessForm);
  fixture.componentRef.setInput("initial", initial);
  const saved: unknown[] = [];
  fixture.componentInstance.save.subscribe((v) => saved.push(v));
  fixture.detectChanges();
  return { fixture, saved };
}

function set(fixture: ReturnType<typeof TestBed.createComponent>, id: string, value: string) {
  const el = fixture.nativeElement.querySelector(`#${id}`) as HTMLInputElement | HTMLSelectElement;
  el.value = value;
  el.dispatchEvent(new Event("input"));
  el.dispatchEvent(new Event("change"));
}

function submitForm(fixture: ReturnType<typeof TestBed.createComponent>) {
  (fixture.nativeElement.querySelector("form") as HTMLFormElement).requestSubmit();
  fixture.detectChanges();
}

describe("HiringProcessForm", () => {
  it("requires a company name", () => {
    const { fixture, saved } = setup();
    submitForm(fixture);
    expect(fixture.nativeElement.textContent).toContain("Company name is required");
    expect(saved).toHaveLength(0);
  });

  it("emits a create payload with salary fields only when a salary is given", () => {
    const { fixture, saved } = setup();
    set(fixture, "companyName", "Acme");
    set(fixture, "jobTitle", "Frontend");
    set(fixture, "status", "ongoing");
    submitForm(fixture);
    expect(saved).toEqual([{ companyName: "Acme", jobTitle: "Frontend", status: "ongoing" }]);
  });

  it("includes currency and rate type when salary is set", () => {
    const { fixture, saved } = setup();
    set(fixture, "companyName", "Acme");
    set(fixture, "salary", "4500");
    set(fixture, "currency", "PEN");
    set(fixture, "salaryRateType", "hourly");
    submitForm(fixture);
    expect(saved[0]).toEqual({
      companyName: "Acme",
      status: "first-contact",
      salary: 4500,
      currency: "PEN",
      salaryRateType: "hourly",
    });
  });

  it("blocks a negative salary with the Zod message", () => {
    const { fixture, saved } = setup();
    set(fixture, "companyName", "Acme");
    set(fixture, "salary", "-5");
    submitForm(fixture);
    expect(fixture.nativeElement.textContent).toContain("Salary must be positive");
    expect(saved).toHaveLength(0);
  });

  it("prefills from initial", () => {
    const { fixture } = setup({
      id: "11111111-1111-4111-8111-111111111111",
      companyName: "Globex",
      jobTitle: "Backend",
      status: "on-hold",
      salary: 2000,
      currency: "USD",
      salaryRateType: "monthly",
      userId: "u1",
      createdAt: "2026-08-01T00:00:00.000Z",
      updatedAt: "2026-08-02T00:00:00.000Z",
    });
    expect((fixture.nativeElement.querySelector("#companyName") as HTMLInputElement).value).toBe(
      "Globex",
    );
    expect((fixture.nativeElement.querySelector("#status") as HTMLSelectElement).value).toBe(
      "on-hold",
    );
    expect((fixture.nativeElement.querySelector("#salary") as HTMLInputElement).value).toBe("2000");
  });

  it("keeps an in-progress edit when initial changes again (e.g. a background refetch)", () => {
    const first: HiringProcess = {
      id: "11111111-1111-4111-8111-111111111111",
      companyName: "Globex",
      jobTitle: "Backend",
      status: "on-hold",
      salary: 2000,
      currency: "USD",
      salaryRateType: "monthly",
      userId: "u1",
      createdAt: "2026-08-01T00:00:00.000Z",
      updatedAt: "2026-08-02T00:00:00.000Z",
    };
    const { fixture } = setup(first);
    expect((fixture.nativeElement.querySelector("#companyName") as HTMLInputElement).value).toBe(
      "Globex",
    );

    // The user starts editing — the form is now dirty.
    set(fixture, "companyName", "Initech");

    // A refetch resolves with a new object (e.g. window-focus refetch of the same record).
    fixture.componentRef.setInput("initial", { ...first, companyName: "Umbrella Corp" });
    fixture.detectChanges();

    // The user's in-progress edit must survive — the effect must not reset over it.
    expect((fixture.nativeElement.querySelector("#companyName") as HTMLInputElement).value).toBe(
      "Initech",
    );
  });
});
