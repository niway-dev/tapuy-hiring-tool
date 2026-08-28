/** Generates src/tokens.stylex.ts from the same raw palette dist/tokens.css
    is emitted from (see emit-css.ts). Run by `bun run generate:stylex`.

    Why generated rather than hand-written import: `stylex.defineVars()` and
    `stylex.createTheme()` can only take an object literal written in the
    same file — see the header this script writes into the output file for
    the mechanism and the trap. Generating it keeps `./tokens.ts` as the one
    hand-maintained source while still producing valid, self-contained
    StyleX source at commit time (required — @stylexjs/babel-plugin reads
    this file's TypeScript source during the app build, so it can't be a
    gitignored build artifact like dist/tokens.css). */
import { writeFileSync } from "node:fs";
import { dark, light, type TokenSet } from "../src/tokens";
import { fonts } from "../src/fonts";

const IDENTIFIER = /^[A-Za-z_$][A-Za-z0-9_$]*$/;

/** oxfmt (the repo's formatter, run by the pre-commit hook and by CI's
    format-check step) prefers single quotes over an escaped double-quoted
    string. `JSON.stringify()` always emits double quotes, so on any value
    containing a `"` — the three font stacks are the only case today — its
    output gets rewritten by oxfmt on the very next commit, and this
    generator's output would then permanently disagree with the committed
    file. Match oxfmt's choice instead of fighting it, so `generate:stylex`
    stays idempotent. */
function serializeString(value: string): string {
  if (value.includes('"') && !value.includes("'")) {
    return `'${value}'`;
  }
  return JSON.stringify(value);
}

function objectLiteral(tokens: Readonly<Record<string, string>>): string {
  const lines = Object.entries(tokens).map(([key, value]) => {
    const k = IDENTIFIER.test(key) ? key : JSON.stringify(key);
    return `  ${k}: ${serializeString(value)},`;
  });
  return `{\n${lines.join("\n")}\n}`;
}

const HEADER = `/* GENERATED — do not edit. Run \`bun run generate:stylex\` in
   packages/design-tokens (source: ./tokens.ts, ./fonts.ts). CI regenerates
   this file and fails the PR if it differs from what's committed.

   Why the palette is written out literally here instead of
   \`import { dark } from "./tokens"\`: this repo's StyleX config uses
   \`unstable_moduleResolution: { type: "commonJS" }\`, and under that mode
   defineVars()/createTheme() can only take a value written in the same
   file. A plain \`.ts\` import is rejected outright — the import specifier
   must end in \`.stylex\`, \`.stylex.const\`, or \`.transformed\`, and
   "./tokens" matches none of them.

   The trap: renaming the import to qualify does NOT fix it. Under
   \`commonJS\`, a qualifying import resolves through a theme-reference
   proxy, not the real value — \`defineVars(dark)\` would silently compile
   to \`{ __varGroupHash__: "..." }\` with none of the actual variables. No
   build error, just broken CSS custom properties.

   (Real cross-file *value* reading only exists under
   \`unstable_moduleResolution: { type: "experimental_crossFileParsing" }\`,
   which this repo does not use — and which has its own, unrelated bug in
   @stylexjs/babel-plugin@0.19.0: it deopts on every file, because its
   success check treats Babel's always-present, always-truthy empty
   \`ast.errors\` array as a parse failure.)

   So: literal values, kept in sync with ./tokens.ts by this generator. */`;

const output = `${HEADER}
import * as stylex from "@stylexjs/stylex";

export const colors = stylex.defineVars(${objectLiteral(dark)});

export const typography = stylex.defineVars(${objectLiteral(fonts)});

/** Applied as a class on <html> when the theme cookie says "light". */
export const lightTheme = stylex.createTheme(colors, ${objectLiteral(light satisfies TokenSet)});
`;

writeFileSync(new URL("../src/tokens.stylex.ts", import.meta.url), output);
console.log(`design-tokens: wrote src/tokens.stylex.ts (${output.length} bytes)`);
