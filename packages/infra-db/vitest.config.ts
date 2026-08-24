import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    include: ["src/**/__tests__/**/*.test.ts"],
    name: "infra-db",
    testTimeout: 20000, // pglite schema push on first run
  },
});
