import { defineConfig } from "@playwright/test";

/* COMPARE_ONLY_PUBLIC=1 restricts the run to the three unauthenticated
   routes (see routes.ts). No login is needed then, so the "compare" project
   drops its dependency on "auth" — otherwise it would demand
   COMPARE_EMAIL/COMPARE_PASSWORD even though nothing in the run uses them. */
const onlyPublic = process.env.COMPARE_ONLY_PUBLIC === "1";

export default defineConfig({
  testDir: ".",
  outputDir: "output/traces",
  fullyParallel: false,
  workers: 1,
  reporter: [["list"]],
  use: {
    headless: true,
    /* `reducedMotion` isn't a top-level PlaywrightTestOptions field (it
       lives on BrowserContextOptions) — it has to go through
       `contextOptions`, per Playwright's own example for this option. */
    contextOptions: { reducedMotion: "reduce" },
    /* No `colorScheme` here: the app doesn't read `prefers-color-scheme`,
       it keys off the `tapuy:theme` cookie (see themeCookie() in
       routes.ts). Forcing a browser-level colorScheme would be
       misleading for the light-theme screenshots. */
  },
  projects: [
    { name: "auth", testMatch: /auth\.setup\.ts/ },
    {
      name: "compare",
      testMatch: /compare\.spec\.ts/,
      dependencies: onlyPublic ? [] : ["auth"],
    },
  ],
});
