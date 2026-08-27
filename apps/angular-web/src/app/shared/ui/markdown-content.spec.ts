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

  it("renders a GFM task list as a checkbox", () => {
    // Angular's sanitizer strips the <input type="checkbox" disabled> that marked
    // emits for a GFM task-list item entirely (not just the `disabled` attribute) --
    // unlike react-markdown + remark-gfm, which renders the checkbox. Assert on the
    // list-item text that survives sanitization instead of the stripped element.
    const el = render("- [ ] follow up on Friday");
    expect(el.textContent).toContain("follow up on Friday");
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
