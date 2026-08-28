import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";
import { dark, light } from "./tokens";
import { fonts } from "./fonts";

const css = readFileSync(new URL("../../web-ui/src/styles.css", import.meta.url), "utf8");

/** Pull one `--name: value;` block out of styles.css. */
function declarationsIn(selector: string): Map<string, string> {
  const start = css.indexOf(selector);
  if (start === -1) throw new Error(`selector not found: ${selector}`);
  const block = css.slice(start, css.indexOf("}", start));
  const out = new Map<string, string>();
  for (const match of block.matchAll(/^\s*--([a-z0-9-]+):\s*([^;]+);/gm)) {
    const [, name, value] = match;
    if (name === undefined || value === undefined) continue;
    out.set(name, value.trim());
  }
  return out;
}

const camel = (kebab: string) => kebab.replace(/-([a-z0-9])/g, (_, c) => c.toUpperCase());

describe("palette parity with web-ui/styles.css", () => {
  it("declares every token the dark :root block declares", () => {
    const missing = [...declarationsIn(":root {").keys()]
      .map(camel)
      .filter((name) => !(name in dark));
    expect(missing).toEqual([]);
  });

  it("declares every token the light block declares", () => {
    // Matched with the trailing " {": the bare selector text also appears
    // in the file header comment ("Light con [data-theme=\"light\"].") on
    // line 5, well before the real rule. Without the brace, indexOf finds
    // that comment first and declarationsIn silently returns the *dark*
    // block's declarations instead (found via the next "}", which is
    // :root's closing brace) — the test would then pass trivially, and for
    // the wrong reason: it checked dark's keys against `light`, not light's.
    const missing = [...declarationsIn('[data-theme="light"] {').keys()]
      .map(camel)
      .filter((name) => !(name in light));
    expect(missing).toEqual([]);
  });

  it("gives dark and light exactly the same key set", () => {
    expect(Object.keys(light).sort()).toEqual(Object.keys(dark).sort());
  });

  /* The previous test alone is weak: light legitimately declares only 38 of
     the 56 names (the other 18 — shadcn aliases plus --focus-ring — resolve
     to different light values through var() indirection, per Task 2). A test
     that only checked "every light-block name exists in `light`" would pass
     even if tokens.ts had silently copied dark's value for one of those 38,
     because existence alone doesn't prove the transcription used the right
     number. This test makes that failure mode visible: for every token the
     light block *itself* redeclares with a literal value different from
     dark's, `light[name]` must differ from `dark[name]` too. */
  it("resolves every explicit light override to a value different from dark's", () => {
    const darkRaw = declarationsIn(":root {");
    const lightRaw = declarationsIn('[data-theme="light"] {');

    const shouldDiffer = [...lightRaw.entries()]
      .filter(([name, value]) => darkRaw.get(name) !== value)
      .map(([name]) => camel(name));

    // Sanity: the light block should have at least the 38 tokens Task 2
    // documented — if this drops to 0 the diff check below is vacuous.
    expect(shouldDiffer.length).toBeGreaterThan(0);

    const notDiverged = shouldDiffer.filter(
      (name) => light[name as keyof typeof light] === dark[name as keyof typeof dark],
    );
    expect(notDiverged).toEqual([]);
  });
});

/* tokens.stylex.ts embeds `dark`/`light`/`fonts` as literal object
   expressions instead of importing them from ./tokens.ts and ./fonts.ts —
   see the comment at the top of that file for why cross-file imports into
   `defineVars()`/`createTheme()` don't compile with the installed
   @stylexjs/babel-plugin@0.19.0. That literal duplication needs the same
   kind of drift guard the tests above give the Tailwind/tokens.ts pair: this
   suite parses the three object literals out of tokens.stylex.ts's source
   text and asserts each equals its source of truth exactly. */
const stylexSrc = readFileSync(new URL("./tokens.stylex.ts", import.meta.url), "utf8");

/** Pull the flat `{ key: "value", ... }` object literal that starts right
    after `marker` in tokens.stylex.ts and ends at the first unindented `})`
    or `});` that follows. Safe only because none of these three literals
    nest an object inside another — every value is a plain string. */
function objectLiteralAfter(marker: string): Record<string, string> {
  const start = stylexSrc.indexOf(marker);
  if (start === -1) throw new Error(`marker not found in tokens.stylex.ts: ${marker}`);
  const bodyStart = stylexSrc.indexOf("{", start);
  const bodyEnd = stylexSrc.indexOf("});", bodyStart);
  if (bodyStart === -1 || bodyEnd === -1) {
    throw new Error(`could not find object literal body for marker: ${marker}`);
  }
  const body = stylexSrc.slice(bodyStart, bodyEnd);
  const out: Record<string, string> = {};
  for (const match of body.matchAll(/^\s*(\w+):\s*(?:"([^"]*)"|'([^']*)'),?\s*$/gm)) {
    const [, key, dq, sq] = match;
    if (key === undefined) continue;
    out[key] = dq ?? sq ?? "";
  }
  return out;
}

describe("tokens.stylex.ts literals match their source of truth", () => {
  it("colors == dark", () => {
    expect(objectLiteralAfter("export const colors = stylex.defineVars(")).toEqual({ ...dark });
  });

  it("lightTheme's override object == light", () => {
    expect(objectLiteralAfter("export const lightTheme = stylex.createTheme(colors, ")).toEqual({
      ...light,
    });
  });

  it("typography == fonts", () => {
    expect(objectLiteralAfter("export const typography = stylex.defineVars(")).toEqual({
      ...fonts,
    });
  });
});
