import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";
import { dark, light } from "./tokens";

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

/* The suite above only checks key *existence* and key *sets* — never that a
   value in tokens.ts equals what styles.css actually declares. That's a
   real hole: change `dark.mint` from "#00ffc2" to "#00ffc3" (or any single
   hex digit in either theme) and every test above still passes, because
   none of them read the value on the tokens.ts side and compare it to
   anything. This suite closes that: for every :root declaration that is a
   plain literal (no `var()` indirection), assert `dark`/`light` carry that
   exact value. */
describe("dark/light values match web-ui/styles.css exactly", () => {
  const darkRaw = declarationsIn(":root {");
  const lightRaw = declarationsIn('[data-theme="light"] {');

  // Excludes the 16 shadcn aliases (`--background: var(--bg)` and friends)
  // and --focus-ring, whose :root declaration is `0 0 0 2px var(--bg), 0 0 0
  // 4px var(--mint))` — composed from two var() refs, not copyable as text.
  // --focus-ring gets its own explicit check below instead of being folded
  // into this filter silently.
  const literalNames = [...darkRaw.entries()]
    .filter(([, value]) => !value.includes("var("))
    .map(([name]) => name);

  // Sanity: this should be the ~39 plain-literal tokens (56 total minus 16
  // var() aliases minus focus-ring) — if this collapses to 0 every test
  // below is vacuous.
  it("finds a non-trivial set of literal tokens to check", () => {
    expect(literalNames.length).toBeGreaterThan(30);
  });

  for (const kebabName of literalNames) {
    const name = camel(kebabName) as keyof typeof dark;

    it(`dark.${name} matches its :root declaration`, () => {
      // Non-null: kebabName came from darkRaw's own keys() a few lines up.
      // Cast to `string`: `dark` is `as const`, so `dark[name]` narrows to a
      // literal union that a dynamic `name: keyof typeof dark` can't match.
      expect(dark[name] as string).toBe(darkRaw.get(kebabName)!);
    });

    it(`light.${name} matches its declared value`, () => {
      // Almost every literal token is redeclared verbatim inside
      // [data-theme="light"]. --radius is the one exception (dark and
      // light share "0.5rem", so the light block never repeats it) —
      // fall back to the :root value for any name light doesn't redeclare.
      // Non-null on the fallback: same reasoning as above.
      const expected = lightRaw.get(kebabName) ?? darkRaw.get(kebabName)!;
      expect(light[name]).toBe(expected);
    });
  }

  // --focus-ring, handled deliberately: reconstruct the composed value by
  // hand from the `bg`/`mint` values this same suite already verifies
  // above, rather than silently skipping the one token every keyboard user
  // actually sees an outline from.
  it("dark.focusRing resolves var(--bg)/var(--mint) to dark's own values", () => {
    expect(dark.focusRing).toBe(`0 0 0 2px ${dark.bg}, 0 0 0 4px ${dark.mint}`);
  });

  it("light.focusRing resolves var(--bg)/var(--mint) to light's own values", () => {
    expect(light.focusRing).toBe(`0 0 0 2px ${light.bg}, 0 0 0 4px ${light.mint}`);
  });
});
