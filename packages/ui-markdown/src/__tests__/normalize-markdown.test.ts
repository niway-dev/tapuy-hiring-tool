import { describe, expect, it } from "vitest";
import { normalizeMarkdown } from "../normalize-markdown";

describe("normalizeMarkdown", () => {
  it("returns non-string input unchanged", () => {
    expect(normalizeMarkdown("")).toBe("");
    expect(normalizeMarkdown(null as unknown as string)).toBeNull();
  });

  it("normalizes CRLF line endings to LF", () => {
    expect(normalizeMarkdown("a\r\nb")).not.toContain("\r");
    expect(normalizeMarkdown("a\r\nb")).toBe("a\nb");
  });

  it("leaves an existing markdown heading alone", () => {
    const input = "## Already a heading";
    expect(normalizeMarkdown(input)).toContain("## Already a heading");
  });

  it("leaves a list item alone", () => {
    expect(normalizeMarkdown("- an item")).toContain("- an item");
  });

  it("preserves inline code spans", () => {
    expect(normalizeMarkdown("cost is `$` per month")).toContain("`$`");
  });

  it("preserves GFM task list syntax", () => {
    expect(normalizeMarkdown("- [ ] follow up")).toContain("- [ ]");
  });

  it("converts a short capitalized line followed by content into a heading, even without a colon", () => {
    // Surprising: any short (<=55 char) line starting with an uppercase letter and
    // followed by more text is treated as an informal title and promoted to "## ".
    // There is no requirement for a trailing colon.
    const input = "Overview\nSome details here that continue.";
    expect(normalizeMarkdown(input)).toBe("## Overview\n\nSome details here that continue.");
  });

  it("converts a short line ending with a colon into a heading, stripping the colon", () => {
    const input = "Summary:\nSome body text follows.";
    expect(normalizeMarkdown(input)).toBe("## Summary\n\nSome body text follows.");
  });

  it("converts informal dash/em-dash/bullet list markers to a standard '- ' marker", () => {
    const input = "– item one\n— item two\n• item three\n- item four";
    expect(normalizeMarkdown(input)).toBe("- item one\n- item two\n- item three\n- item four");
  });

  it("normalizes numbered list markers to 'N. ' regardless of ')' vs '.' or missing space", () => {
    const input = "1) First\n2.Second\n3.  Third";
    expect(normalizeMarkdown(input)).toBe("1. First\n2. Second\n3. Third");
  });

  it("adds a blank line before a heading that immediately follows text", () => {
    const input = "text before\n## Heading";
    expect(normalizeMarkdown(input)).toBe("text before\n\n## Heading");
  });

  it("adds a blank line after a heading that is immediately followed by text", () => {
    const input = "## Heading\ntext after";
    expect(normalizeMarkdown(input)).toBe("## Heading\n\ntext after");
  });

  it("adds a blank line between a sentence ending in punctuation and a capitalized sentence that follows", () => {
    const input = "This is a sentence.\nNext sentence starts here.";
    expect(normalizeMarkdown(input)).toBe("This is a sentence.\n\nNext sentence starts here.");
  });

  it("collapses three or more consecutive blank lines down to a single blank line", () => {
    expect(normalizeMarkdown("a\n\n\n\nb")).toBe("a\n\nb");
  });

  it("trims leading and trailing whitespace from the whole document", () => {
    expect(normalizeMarkdown("  \n\nhello world\n\n  ")).toBe("hello world");
  });

  it("is idempotent for a title-plus-body input", () => {
    const once = normalizeMarkdown("Some Title\nbody text");
    expect(normalizeMarkdown(once)).toBe(once);
  });
});
