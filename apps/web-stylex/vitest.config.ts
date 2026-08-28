import path from "node:path";
import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import tsConfigPaths from "vite-tsconfig-paths";

/**
 * Standalone from vite.config.ts on purpose: the app config loads the
 * Cloudflare and TanStack Start plugins, which need a worker runtime and have
 * no place in a jsdom test run.
 */
const monorepoRoot = path.resolve(__dirname, "../..");

export default defineConfig({
  plugins: [
    tsConfigPaths(),
    react({
      babel: {
        plugins: [
          [
            "@stylexjs/babel-plugin",
            {
              dev: true,
              test: true,
              runtimeInjection: false,
              unstable_moduleResolution: { type: "commonJS", rootDir: monorepoRoot },
            },
          ],
        ],
      },
    }),
  ],
  test: {
    globals: true,
    environment: "jsdom",
    setupFiles: ["./src/test/setup.ts"],
    include: ["src/**/*.test.{ts,tsx}"],
    name: "web-stylex",
  },
});
