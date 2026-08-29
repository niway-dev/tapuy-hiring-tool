import path from "node:path";
import tailwindcss from "@tailwindcss/vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import viteReact from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import tsconfigPaths from "vite-tsconfig-paths";
import { cloudflare } from "@cloudflare/vite-plugin";

/* Monorepo root. StyleX hashes defineVars by path relative to rootDir, so every
   workspace must use the same value or cross-package variables will not match. */
const monorepoRoot = path.resolve(__dirname, "../..");

export default defineConfig({
  plugins: [
    tailwindcss(),
    tsconfigPaths(),
    tanstackStart(),
    cloudflare({ viteEnvironment: { name: "ssr" } }),
    viteReact({
      babel: {
        plugins: [
          [
            "@stylexjs/babel-plugin",
            {
              dev: process.env.NODE_ENV !== "production",
              runtimeInjection: false,
              unstable_moduleResolution: { type: "commonJS", rootDir: monorepoRoot },
            },
          ],
        ],
      },
    }),
  ],
  server: {
    port: 3002,
  },
});
