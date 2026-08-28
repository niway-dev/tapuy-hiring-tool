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
    reducedMotion: "reduce",
    colorScheme: "dark",
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
