import { mkdirSync, writeFileSync } from "node:fs";
import { test, type Page } from "@playwright/test";
import pixelmatch from "pixelmatch";
import { PNG } from "pngjs";
import {
  ACTIVE_ROUTES,
  ORIGINS,
  THEMES,
  VIEWPORTS,
  resolveRoute,
  themeCookie,
  type Theme,
} from "./routes";

type Result = { id: string; diffPercent: number; width: number; height: number };
const results: Result[] = [];
const OUT = "compare/output";

for (const dir of ["baseline", "candidate", "diff"])
  mkdirSync(`${OUT}/${dir}`, { recursive: true });

async function shoot(page: Page, origin: string, path: string, theme: Theme): Promise<Buffer> {
  await page.context().addCookies([themeCookie(origin, theme)]);
  const url = `${origin}${path}`;
  const res = await page.goto(url, { waitUntil: "networkidle" });

  if (!res) throw new Error(`compare: no response for ${url}`);
  if (res.status() >= 400) {
    throw new Error(`compare: ${url} returned ${res.status()}`);
  }

  /* Identity check: a 200 that silently renders the wrong page (an auth
     redirect, a route that bounces to /, a shared build regression that
     serves the same fallback on both origins) would otherwise pixel-diff
     as identical and report a false 0.000%. Compare the landed path against
     the requested one, ignoring a trailing slash. */
  const requestedPath = new URL(url).pathname.replace(/\/$/, "") || "/";
  const landedPath = new URL(page.url()).pathname.replace(/\/$/, "") || "/";
  if (landedPath !== requestedPath) {
    throw new Error(
      `compare: requested ${url} but landed on ${page.url()} (expected path ${requestedPath}, got ${landedPath})`,
    );
  }

  await page.evaluate(() => document.fonts.ready);
  return page.screenshot({ fullPage: true, animations: "disabled", caret: "hide" });
}

for (const route of ACTIVE_ROUTES) {
  for (const viewport of VIEWPORTS) {
    for (const theme of THEMES) {
      const id = `${route.name}--${viewport.name}--${theme}`;

      test(id, async ({ browser }) => {
        const contexts = {
          baseline: await browser.newContext({
            viewport,
            storageState: route.auth ? "compare/.auth/baseline.json" : undefined,
          }),
          candidate: await browser.newContext({
            viewport,
            storageState: route.auth ? "compare/.auth/candidate.json" : undefined,
          }),
        };
        const pages = {
          baseline: await contexts.baseline.newPage(),
          candidate: await contexts.candidate.newPage(),
        };

        const path = await resolveRoute(pages.baseline, route, ORIGINS.baseline);
        const a = PNG.sync.read(await shoot(pages.baseline, ORIGINS.baseline, path, theme));
        const b = PNG.sync.read(await shoot(pages.candidate, ORIGINS.candidate, path, theme));

        const width = Math.max(a.width, b.width);
        const height = Math.max(a.height, b.height);
        const pad = (png: PNG) => {
          if (png.width === width && png.height === height) return png;
          const out = new PNG({ width, height });
          PNG.bitblt(png, out, 0, 0, png.width, png.height, 0, 0);
          return out;
        };
        const pa = pad(a);
        const pb = pad(b);
        const diff = new PNG({ width, height });
        const changed = pixelmatch(pa.data, pb.data, diff.data, width, height, { threshold: 0.1 });
        const diffPercent = (changed / (width * height)) * 100;

        writeFileSync(`${OUT}/baseline/${id}.png`, PNG.sync.write(pa));
        writeFileSync(`${OUT}/candidate/${id}.png`, PNG.sync.write(pb));
        writeFileSync(`${OUT}/diff/${id}.png`, PNG.sync.write(diff));
        results.push({ id, diffPercent, width, height });

        await contexts.baseline.close();
        await contexts.candidate.close();
      });
    }
  }
}

test.afterAll(() => {
  writeFileSync(`${OUT}/summary.json`, JSON.stringify(results, null, 2));
});
