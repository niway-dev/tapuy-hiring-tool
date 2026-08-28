import { readFileSync } from "node:fs";

const THRESHOLD = 0.1;
type Result = { id: string; diffPercent: number; width: number; height: number };

const results: Result[] = JSON.parse(readFileSync("compare/output/summary.json", "utf8"));

/* An empty result set is not a pass. It means the run produced nothing —
   a crashed spec, a filter that matched no tests, a script wired up wrong —
   and `failing.length ? 1 : 0` would otherwise exit 0 on vacuous truth.
   Today this is masked by the npm script's `&&` chain (a crashed
   `playwright test` never reaches this file), but that safety lives in the
   shell operator, not here — guard it explicitly so `report.ts` is safe to
   run standalone or wire into CI on its own. */
if (results.length === 0) {
  console.error("compare: summary.json contains no results — the run produced nothing. Failing.");
  process.exit(1);
}

const rows = results.map((r) => ({
  screenshot: r.id,
  size: `${r.width}×${r.height}`,
  "diff %": r.diffPercent.toFixed(3),
  status: r.diffPercent <= THRESHOLD ? "ok" : "ABOVE THRESHOLD",
}));
console.table(rows);

const failing = results.filter((r) => r.diffPercent > THRESHOLD);
console.log(
  `\n${results.length} screenshots · ${failing.length} above ${THRESHOLD}% · diffs in compare/output/diff/`,
);
process.exit(failing.length ? 1 : 0);
