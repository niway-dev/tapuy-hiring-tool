import path from "node:path";
import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

/**
 * Standalone from any build config on purpose: this package has no bundler
 * config of its own, and a jsdom test run needs a runtime the tsc-only build
 * doesn't provide.
 */
const monorepoRoot = path.resolve(__dirname, "../..");

export default defineConfig({
  plugins: [
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
    include: ["src/**/*.test.{ts,tsx}"],
    name: "web-ui-stylex",
  },
});
