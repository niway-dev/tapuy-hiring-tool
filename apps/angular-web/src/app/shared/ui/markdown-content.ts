import { Component, computed, input } from "@angular/core";
import { normalizeMarkdown } from "@interviews-tool/ui-markdown";
import { Marked } from "marked";

/* One parser instance for the whole app: constructing Marked per render is
   wasteful, and the options must not drift between call sites. GFM is on so
   task lists, tables and strikethrough match what react-markdown renders in
   apps/web via remark-gfm. */
const marked = new Marked({ gfm: true, breaks: true });

@Component({
  selector: "app-markdown",
  styleUrl: "./markdown-content.css",
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
