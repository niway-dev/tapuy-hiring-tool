import { TestBed } from "@angular/core/testing";
import { QuickCapture } from "./quick-capture";

function setup() {
  TestBed.configureTestingModule({});
  const fixture = TestBed.createComponent(QuickCapture);
  fixture.detectChanges();
  const logged: string[] = [];
  fixture.componentInstance.log.subscribe((v) => logged.push(v));
  const input = fixture.nativeElement.querySelector("input") as HTMLInputElement;
  return { fixture, logged, input };
}

function type(input: HTMLInputElement, value: string) {
  input.value = value;
  input.dispatchEvent(new Event("input"));
}

describe("QuickCapture", () => {
  it("emits the trimmed content when Enter is pressed", () => {
    const { fixture, logged, input } = setup();
    type(input, "  Recruiter called about the role  ");
    fixture.detectChanges();
    input.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true }));
    fixture.detectChanges();
    expect(logged).toEqual(["Recruiter called about the role"]);
  });

  it("emits when the Log button is clicked", () => {
    const { fixture, logged, input } = setup();
    type(input, "Recruiter called about the role");
    fixture.detectChanges();
    (fixture.nativeElement.querySelector("button") as HTMLButtonElement).click();
    expect(logged).toHaveLength(1);
  });

  it("refuses content shorter than 10 characters and says why", () => {
    const { fixture, logged, input } = setup();
    type(input, "called");
    fixture.detectChanges();
    (fixture.nativeElement.querySelector("button") as HTMLButtonElement).click();
    fixture.detectChanges();
    expect(logged).toHaveLength(0);
    expect(fixture.nativeElement.textContent).toContain("at least 10 characters");
  });

  it("does nothing when the field is empty", () => {
    const { fixture, logged } = setup();
    (fixture.nativeElement.querySelector("button") as HTMLButtonElement).click();
    fixture.detectChanges();
    expect(logged).toHaveLength(0);
  });

  it("clears the field after a successful emit", () => {
    const { fixture, input } = setup();
    type(input, "Recruiter called about the role");
    fixture.detectChanges();
    (fixture.nativeElement.querySelector("button") as HTMLButtonElement).click();
    fixture.detectChanges();
    expect((fixture.nativeElement.querySelector("input") as HTMLInputElement).value).toBe("");
  });

  it("shows a server error passed in from the parent", () => {
    const { fixture } = setup();
    fixture.componentRef.setInput("serverError", "Could not log that");
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain("Could not log that");
  });
});
