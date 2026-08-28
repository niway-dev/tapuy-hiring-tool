import { readFileSync } from "node:fs";

const THRESHOLD = 0.1;
type Result = { id: string; diffPercent: number; width: number; height: number };

const results: Result[] = JSON.parse(readFileSync("compare/output/summary.json", "utf8"));
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
