import { TestBed } from "@angular/core/testing";
import { MarkdownContent } from "./markdown-content";

function render(content: string): HTMLElement {
  TestBed.configureTestingModule({});
  const fixture = TestBed.createComponent(MarkdownContent);
  fixture.componentRef.setInput("content", content);
  fixture.detectChanges();
  return fixture.nativeElement as HTMLElement;
}

describe("MarkdownContent", () => {
  it("renders bold text as <strong>", () => {
    expect(render("**Base:** 5000").querySelector("strong")?.textContent).toBe("Base:");
  });

  it("renders inline code as <code>", () => {
    expect(render("cost is `$` monthly").querySelector("code")?.textContent).toBe("$");
  });

  it("renders an unchecked GFM task list item as a task-checkbox span", () => {
    // Angular's sanitizer strips the raw <input type="checkbox"> that marked would
    // otherwise emit (and strips data-* attributes too), so the component's Marked
    // instance overrides the checkbox renderer to emit an inert
    // <span class="task-checkbox" role="checkbox" aria-checked="..."> instead
    // (see markdown-content.ts) -- that span is what survives sanitization and is
    // what markdown-content.css draws a visible box for.
    const el = render("- [ ] follow up on Friday");
    const item = el.querySelector("li");
    expect(item?.textContent).toContain("follow up on Friday");
    expect(item?.textContent).not.toContain("[ ]");
    const checkbox = el.querySelector(".task-checkbox");
    expect(checkbox).not.toBeNull();
    expect(checkbox?.getAttribute("aria-checked")).toBe("false");
  });

  it("renders a checked GFM task list item with aria-checked=true", () => {
    const el = render("- [x] done thing");
    const checkbox = el.querySelector(".task-checkbox");
    expect(checkbox).not.toBeNull();
    expect(checkbox?.getAttribute("aria-checked")).toBe("true");
  });

  it("renders a paragraph for plain text", () => {
    expect(render("just a note").querySelector("p")?.textContent).toContain("just a note");
  });

  it("strips a script tag rather than executing it", () => {
    const el = render("hello <script>alert(1)</script> world");
    expect(el.querySelector("script")).toBeNull();
    expect(el.textContent).toContain("hello");
  });

  it("renders nothing for empty content", () => {
    expect(render("").textContent?.trim()).toBe("");
  });
});
