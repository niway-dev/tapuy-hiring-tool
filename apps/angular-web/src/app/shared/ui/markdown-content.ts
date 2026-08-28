import { Component, computed, input } from "@angular/core";
import { normalizeMarkdown } from "@interviews-tool/ui-markdown";
import { Marked } from "marked";

/* One parser instance for the whole app: constructing Marked per render is
   wasteful, and the options must not drift between call sites. GFM is on so
   task lists, tables and strikethrough match what react-markdown renders in
   apps/web via remark-gfm. `breaks` is deliberately left off (its default is
   false): react-markdown does not enable it either, so a single newline
   renders as a space (CommonMark), not a <br>. */
const marked = new Marked({ gfm: true }).use({
  renderer: {
    /* Angular's sanitizer drops <input> outright, so a GFM task list would lose
       its box. Emitting an inert span keeps the visual parity with apps/web
       without bypassing the sanitizer — the React checkbox is disabled anyway.
       `data-*` attributes are NOT in Angular's sanitizer allowlist (checked
       directly against @angular/core's VALID_ATTRS) and get stripped silently;
       `aria-checked` is, and is the semantically correct attribute for a
       checkbox-shaped element anyway, so state rides on that instead. */
    checkbox({ checked }) {
      return `<span class="task-checkbox" role="checkbox" aria-checked="${checked}" aria-disabled="true"></span>`;
    },
  },
});

/* The stylesheet is imported globally in styles.css, not via styleUrl, because
   these rules target markup produced by [innerHTML]. Emulated encapsulation
   only stamps _ngcontent-* on the component's own template, so a scoped copy
   would never match a single parsed element. */
@Component({
  selector: "app-markdown",
  template: `
    <div class="markdown-content" [class.markdown-content-compact]="variant() === 'compact'">
      <!-- Angular sanitizes [innerHTML] on its own: no bypassSecurityTrust here,
           so a <script> in someone's note is stripped rather than executed. -->
      <div [innerHTML]="html()"></div>
    </div>
  `,
})
export class MarkdownContent {
  readonly content = input.required<string>();
  readonly variant = input<"default" | "compact">("default");
  /** `normalize` mirrors apps/web's MarkdownContent prop; off means render as written. */
  readonly normalize = input(true);

  protected readonly html = computed(() => {
    const raw = this.content();
    if (!raw) return "";
    const source = this.normalize() ? normalizeMarkdown(raw) : raw;
    // parse() is sync unless async:true is set; we never set it.
    return marked.parse(source) as string;
  });
}
