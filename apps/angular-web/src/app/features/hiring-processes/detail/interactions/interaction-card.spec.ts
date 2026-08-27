import { TestBed } from "@angular/core/testing";
import { InteractionCard } from "./interaction-card";
import type { Interaction } from "../../../../core/api/interaction.model";

const item: Interaction = {
  id: "22222222-2222-4222-8222-222222222222",
  hiringProcessId: "11111111-1111-4111-8111-111111111111",
  title: null,
  content: "**Base:** 5000\n\n- [ ] follow up",
  type: "phone-call",
  createdAt: "2026-08-20T09:20:00.000Z",
  updatedAt: "2026-08-20T09:20:00.000Z",
};

function render(interaction: Interaction) {
  TestBed.configureTestingModule({});
  const fixture = TestBed.createComponent(InteractionCard);
  fixture.componentRef.setInput("interaction", interaction);
  fixture.detectChanges();
  return fixture;
}

describe("InteractionCard", () => {
  it("shows the type badge and the absolute timestamp", () => {
    const el = render(item).nativeElement as HTMLElement;
    expect(el.querySelector(".badge-type")?.textContent?.trim()).toBe("Phone Call");
    expect(el.textContent).toContain("Aug 20, 2026");
    expect(el.textContent).toContain("9:20 AM");
  });

  it("renders the content as markdown", () => {
    const el = render(item).nativeElement as HTMLElement;
    expect(el.querySelector("strong")?.textContent).toBe("Base:");
    // Angular's sanitizer strips <input> from [innerHTML], so GFM task lists
    // render as an inert `.task-checkbox` span instead (see markdown-content.ts).
    expect(el.querySelector(".task-checkbox")).not.toBeNull();
  });

  it("omits the title element when there is no title", () => {
    const el = render(item).nativeElement as HTMLElement;
    expect(el.querySelector("h4")).toBeNull();
  });

  it("shows the title when present", () => {
    const el = render({ ...item, title: "Recruiter call" }).nativeElement as HTMLElement;
    expect(el.querySelector("h4")?.textContent).toContain("Recruiter call");
  });

  it("emits edit and remove with the interaction", () => {
    const fixture = render(item);
    const edited: Interaction[] = [];
    const removed: Interaction[] = [];
    fixture.componentInstance.edit.subscribe((v) => edited.push(v));
    fixture.componentInstance.remove.subscribe((v) => removed.push(v));
    const buttons = (fixture.nativeElement as HTMLElement).querySelectorAll("button");
    (buttons[0] as HTMLButtonElement).click();
    (buttons[1] as HTMLButtonElement).click();
    expect(edited).toEqual([item]);
    expect(removed).toEqual([item]);
  });
});
